import { RecordCheckTransactionRepository } from './repository';
import { AppError, type Db, type Tx } from '@nba/db';
import { cleanName } from '../../shared/helpers';
import type { CreateCheckInput, UpdateCheckInput, AnalyzeCheckOutput } from './dto';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';
import { normaliseCheckNumber, chooseAmountCents, normaliseIssueDate, pickEmitter } from './extraction';

/** Liaison Workers AI : seule `run` est utilisée. */
export interface VisionAi {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

/**
 * Le modèle de lecture, et la forme de sa réponse.
 *
 * Llama 4 Scout et non Llama 3.2 Vision : il accepte une image en `data:` URL dans un
 * message et une **sortie contrainte par schéma JSON** (`response_format`), là où
 * l'ancien modèle recevait l'image en tableau d'octets — plusieurs millions de nombres
 * pour une photo de téléphone — et rendait du texte libre qu'on fouillait à coups
 * d'expressions régulières.
 */
const VISION_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

/**
 * Ce qu'on demande au modèle : une **transcription**, champ par champ, de ce qu'il voit.
 *
 * Chaque champ est une chaîne « telle qu'écrite ». Décoder — « 05/09/26 » en date,
 * « cent cinquante » en centimes — est le travail d'`extraction.ts`, pas du modèle :
 * un nombre que le modèle aurait converti lui-même ne se relit plus, et c'est
 * précisément la virgule mal placée qu'on lui reprochait. Titulaire et bénéficiaire
 * sont deux champs : demandés ensemble, le modèle ne les confond plus, et c'est le
 * bénéficiaire — le club — qui revenait en « émetteur ».
 */
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    numero_cheque: {
      type: 'string',
      description:
        "Le numéro du chèque : 7 chiffres, premier groupe de la ligne magnétique imprimée tout en bas à gauche du chèque (avant le code banque et le numéro de compte, qui sont plus longs). Il est parfois répété en petit en haut. Chiffres seulement, sans espace."
    },
    montant_chiffres: {
      type: 'string',
      description: "Le montant écrit en chiffres dans la case à droite, tel qu'écrit (exemple : « 150,00 » ou « 42 € 50 »)."
    },
    montant_lettres: {
      type: 'string',
      description: "Le montant écrit en toutes lettres sur la ligne « payez contre ce chèque », tel qu'écrit (exemple : « cent cinquante euros »)."
    },
    beneficiaire: {
      type: 'string',
      description: "Le nom écrit à la main après « à l'ordre de » ou « à » : la personne ou l'association qui reçoit le chèque."
    },
    titulaire: {
      type: 'string',
      description:
        "Le nom du titulaire du compte, IMPRIMÉ par la banque (jamais manuscrit), généralement en bas à gauche au-dessus de la ligne magnétique, parfois avec son adresse (exemple : « M OU MME JEAN DUPONT »). Ce n'est pas le bénéficiaire."
    },
    banque: { type: 'string', description: 'Le nom de la banque, imprimé en haut du chèque (exemple : LCL, Société Générale, Crédit Agricole, La Banque Postale).' },
    date_emission: {
      type: 'string',
      description: "La date écrite à la main après « le » (souvent « à …, le … »), en bas à droite au-dessus de la signature, telle qu'écrite (exemple : « 05/09/26 »)."
    }
  },
  required: ['numero_cheque', 'montant_chiffres', 'montant_lettres', 'beneficiaire', 'titulaire', 'banque', 'date_emission']
} as const;

/** La transcription rendue par le modèle ; chaque champ peut être vide. */
interface CheckTranscript {
  numero_cheque?: string;
  montant_chiffres?: string;
  montant_lettres?: string;
  beneficiaire?: string;
  titulaire?: string;
  banque?: string;
  date_emission?: string;
}

const PROMPT = `Tu lis la photo d'un chèque bancaire français, rempli à la main et remis à une association sportive.
Transcris chaque champ exactement comme il est écrit sur le chèque, sans le convertir ni l'interpréter. Si un champ est illisible ou absent, laisse une chaîne vide.
Repères : la banque est imprimée en haut ; le bénéficiaire est manuscrit après « à l'ordre de » ; le montant en chiffres est dans la case à droite, le montant en lettres sur la première ligne ; la date manuscrite suit « le » en bas à droite, près de la signature ; le titulaire du compte est imprimé en bas à gauche ; la ligne magnétique tout en bas commence par le numéro du chèque (7 chiffres).`;

/** Le type MIME d'après les premiers octets : la `data:` URL doit dire vrai. */
function sniffMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57) return 'image/webp';
  return 'image/jpeg';
}

function toDataUrl(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${sniffMime(bytes)};base64,${btoa(binary)}`;
}

/** La réponse du modèle, en objet : soit déjà un objet, soit du texte JSON à extraire. */
function readTranscript(aiRes: unknown): CheckTranscript {
  let text = '';
  if (typeof aiRes === 'string') {
    text = aiRes;
  } else if (aiRes && typeof aiRes === 'object') {
    const { response } = aiRes as { response?: unknown };
    if (response && typeof response === 'object') return response as CheckTranscript;
    if (typeof response === 'string') text = response;
    else return {};
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as CheckTranscript;
  } catch {
    return {};
  }
}

export async function analyzeCheckImage(
  db: Db,
  ai: VisionAi,
  file: unknown,
  today: Date = new Date()
): Promise<AnalyzeCheckOutput> {
  if (!file) {
    throw new AppError('Fichier image manquant.', 400);
  }

  let bytes: ArrayBuffer;
  if (typeof file === 'string') {
    if (file.startsWith('data:')) {
      const base64Data = file.split(',')[1];
      bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    } else {
      bytes = new TextEncoder().encode(file).buffer;
    }
  } else if (typeof file === 'object' && file !== null) {
    if ('arrayBuffer' in file && typeof (file as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
      bytes = await (file as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer();
    } else {
      throw new AppError('Format de fichier invalide.', 400);
    }
  } else {
    throw new AppError('Format de fichier invalide.', 400);
  }

  let aiRes: unknown;
  try {
    aiRes = await ai.run(VISION_MODEL, {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: toDataUrl(new Uint8Array(bytes)) } }
          ]
        }
      ],
      response_format: { type: 'json_schema', json_schema: CHECK_SCHEMA },
      max_tokens: 512,
      temperature: 0
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : '';
    throw new AppError(`Le modèle de lecture n'a pas répondu${detail ? ` (${detail})` : ''}.`, 502);
  }

  const transcript = readTranscript(aiRes);
  const emitter = pickEmitter(transcript.titulaire, transcript.beneficiaire);

  const repo = new RecordCheckTransactionRepository();
  let matchedMember = null;
  if (emitter) {
    const members = await repo.getAllMembers(db);
    const cleanEmitter = cleanName(emitter);
    for (const m of members) {
      const cleanLast = cleanName(m.lastName);
      const cleanFirst = cleanName(m.firstName);
      const cleanP1 = cleanName(m.parent1Name);
      const cleanP2 = cleanName(m.parent2Name);

      const hasFirstAndLast = cleanFirst && cleanLast && cleanEmitter.includes(cleanFirst) && cleanEmitter.includes(cleanLast);
      const hasParent1 = cleanP1 && cleanEmitter.includes(cleanP1);
      const hasParent2 = cleanP2 && cleanEmitter.includes(cleanP2);

      if (hasFirstAndLast || hasParent1 || hasParent2) {
        matchedMember = m;
        break;
      }
    }
  }

  return {
    number: normaliseCheckNumber(transcript.numero_cheque),
    amount: chooseAmountCents(transcript.montant_chiffres, transcript.montant_lettres),
    emitter,
    bank: (transcript.banque ?? '').trim(),
    memberId: matchedMember ? matchedMember.id : null,
    memberName: matchedMember ? `${matchedMember.lastName} ${matchedMember.firstName}` : null,
    date: normaliseIssueDate(transcript.date_emission, today)
  };
}

/** Libellé automatique de la recette liée : une modification du chèque ne le régénère que s'il est encore intact. */
function autoDescription(number: string, emitter: string): string {
  return `Règlement par chèque n°${number} de ${emitter}`;
}

export async function createCheck(db: Db, body: CreateCheckInput) {
  if (!body.seasonId || !body.number || !body.amount || !body.emitter) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new RecordCheckTransactionRepository();

  // Phase 1 : Lecture (hors batch)
  const categoryVal = body.category ? Number(body.category) : 1;

  const seasonIdInt = await repo.resolveSeasonId(db, body.seasonId);
  const date = body.date || new Date().toISOString().split('T')[0];

  /*
   * La même porte que la saisie du grand livre : exercice clôturé, adhésion d'un autre
   * exercice, et surtout date hors des bornes de l'exercice.
   *
   * Ce chemin ne contrôlait que l'adhésion. Or la date d'un chèque vient d'une lecture IA de
   * la photo (`check-deposit-api.ts`), qui écrase la date du jour : un « 05/09/26 » manuscrit
   * lu « 2025-09-05 » a produit, le 05/09/2026, une recette de 26-27 datée de 25-26. Rien ne
   * la refusait, et l'état de rapprochement de 26-27 a porté un écart de 110,00 € que rien à
   * l'écran ne nommait : l'écriture entrait dans l'à-nouveau reconstitué (par sa date) sans
   * figurer parmi les non-pointées de l'exercice (bornées à son ouverture).
   */
  await validateAccrualAndFiscalPhase(db, {
    seasonId: seasonIdInt,
    type: 'recette',
    date,
    memberId: body.memberId || null
  });

  // Phase 2 : Décision (en mémoire)
  const descStr = body.description || autoDescription(body.number, body.emitter);

  const stmtLedgerEntry = repo.buildCreateLedgerEntryStatement(db, {
    seasonId: seasonIdInt,
    type: 'recette',
    accountId: 1,
    category: categoryVal,
    amount: body.amount,
    date,
    paymentMethodId: 2,
    description: descStr,
    reference: `Chèque n°${body.number}`,
    memberId: body.memberId || null,
    /*
     * Un chèque naît en coffre, comme le dit `payment_methods.default_entry_status` pour le
     * mode « chèque » et comme le fait la saisie du grand livre. Ce chemin laissait le statut
     * au défaut de la table (`cleared`) : les dix chèques de la rentrée 2026 sont nés
     * « encaissés », et le solde bancaire théorique — qui retranche précisément les `in_vault`
     * — comptait comme en banque quatre chèques encore dans le tiroir. Le pointage remet
     * `cleared` (`reconcile-bank-statement-line/repository.ts`).
     */
    status: 'in_vault',
    createdAt: new Date()
  });

  const stmtCheck = repo.buildCreateCheckStatement(db, {
    seasonId: seasonIdInt,
    number: body.number,
    amount: body.amount,
    emitter: body.emitter,
    bank: body.bank || null,
    memberId: body.memberId || null,
    status: 'received',
    photoUrl: body.photoUrl || null,
    createdAt: new Date()
  });

  /*
   * Le règlement de l'adhérent n'est pas mis à jour : `memberships` vient de l'export Poona,
   * qui écrase à chaque import ce qu'on aurait ajouté ici. Le chèque porte déjà son
   * `member_id`, et l'écriture le sien — c'est cela qui dit à quelle adhésion il se rapporte.
   */
  const statements: any[] = [stmtLedgerEntry, stmtCheck];

  // Phase 3 : Écriture (db.batch)
  const results = await db.batch(statements as any);
  const createdCheckId = results[1]?.meta?.last_row_id;

  return repo.getCheckById(db, createdCheckId);
}

export async function deleteCheck(db: Db, id: number) {
  const repo = new RecordCheckTransactionRepository();

  // Phase 1 : Lecture (hors batch)
  const check = await repo.getCheckById(db, id);
  if (!check) {
    throw new AppError('Chèque non trouvé.', 404);
  }
  if (check.status === 'deposited' || check.checkDepositId) {
    throw new AppError("Un chèque inscrit sur une remise ne se supprime pas : supprimez d'abord le bordereau.", 400);
  }

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [repo.buildDeleteCheckStatement(db, id)];

  if (check.ledgerEntryId) {
    statements.push(repo.buildDeleteLedgerEntryStatement(db, check.ledgerEntryId));
  }

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}

/**
 * Modification d'un chèque encore en coffre.
 *
 * Le chèque et la recette qu'il a créée se corrigent d'un seul geste : montant, adhérent,
 * date et catégorie sont reportés sur l'écriture, sans quoi le grand livre continuerait
 * de raconter la première saisie. Deux verrous :
 * - un chèque déjà remis ne bouge plus, son montant est figé dans le bordereau ;
 * - une écriture déjà pointée non plus, la banque l'a confrontée à une ligne de relevé.
 * La saison n'est pas modifiable : elle est reprise du chèque existant.
 *
 * La date et l'adhésion passent par `validateAccrualAndFiscalPhase`, comme à la création :
 * une date hors des bornes de l'exercice du chèque est refusée, et un exercice clôturé aussi.
 */
export async function updateCheck(db: Db, id: number, body: UpdateCheckInput) {
  if (!body.number || !body.amount || !body.emitter || !body.date) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new RecordCheckTransactionRepository();

  // Phase 1 : Lecture (hors batch)
  const existing = await repo.getCheckById(db, id);
  if (!existing) {
    throw new AppError('Chèque non trouvé.', 404);
  }
  // Déposé, ou seulement inscrit sur un bordereau à déposer : son montant est figé dedans.
  if (existing.status === 'deposited' || existing.checkDepositId) {
    throw new AppError("Un chèque déjà inscrit sur une remise ne se modifie plus : supprimez d'abord le bordereau.", 400);
  }

  const memberId = body.memberId ?? null;
  await validateAccrualAndFiscalPhase(db, {
    seasonId: existing.seasonId,
    type: 'recette',
    date: body.date,
    memberId
  });

  const ledger = existing.ledgerEntryId ? await repo.getTransactionById(db, existing.ledgerEntryId) : undefined;
  if (ledger && ledger.bankStatementLineId !== null && ledger.bankStatementLineId !== undefined) {
    throw new AppError('La recette de ce chèque est déjà pointée sur le relevé : elle ne se modifie plus.', 400);
  }

  // Phase 2 : Décision (en mémoire)
  const amountCents = Math.round(body.amount);
  const statements: any[] = [
    repo.buildUpdateCheckStatement(db, id, {
      number: body.number,
      amountCents,
      emitter: body.emitter,
      bank: body.bank || null,
      memberId
    })
  ];

  if (ledger) {
    const categoryId = body.category ? Number(body.category) : (ledger.categoryId ?? 1);
    const description =
      ledger.description === autoDescription(existing.number, existing.emitter)
        ? autoDescription(body.number, body.emitter)
        : ledger.description;
    statements.push(
      repo.buildUpdateLedgerEntryStatement(db, ledger.id, {
        amountCents,
        date: body.date,
        categoryId,
        memberId,
        reference: `Chèque n°${body.number}`,
        description
      })
    );
  }

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);

  return repo.getCheckById(db, id);
}
