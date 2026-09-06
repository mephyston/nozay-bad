import { RecordCheckTransactionRepository } from './repository';
import { AppError, type Db, type Tx } from '@nba/db';
import { cleanName } from '../../shared/helpers';
import type { CreateCheckInput, UpdateCheckInput, AnalyzeCheckOutput } from './dto';
import { assertMembershipMatchesSeason } from '../../shared/member-season';

/** Liaison Workers AI : seule `run` est utilisée. */
export interface VisionAi {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

/** Champs qu'un modèle de vision peut extraire d'un chèque — tous incertains. */
interface ExtractedCheckFields {
  number?: string;
  amount?: number;
  emitter?: string;
  bank?: string;
  date?: string;
}

export async function analyzeCheckImage(
  db: Db,
  ai: VisionAi,
  file: unknown
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
    const model = '@cf/meta/llama-3.2-11b-vision-instruct';
    const systemPrompt = `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the 7-digit check number, usually printed at the bottom-left corner, e.g. '2512612'. Do NOT use the longer bank routing or account numbers)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the handwritten issue date, usually in format DD/MM/YY or DD/MM/YYYY. Look in the bottom-right section, under the numerical amount box and next to the signature, following the pre-printed word 'le' or 'fait le', e.g. '10/09/20' should be extracted as '2020-09-10')"
}
Return ONLY the raw JSON object. Do not wrap it in markdown or other text.`;

    aiRes = await ai.run(model, {
      prompt: systemPrompt,
      image: [...new Uint8Array(bytes)]
    });
  } catch (llamaErr: unknown) {
    let agreed = false;
    const llamaMessage = llamaErr instanceof Error ? llamaErr.message : '';
    if (llamaMessage.includes("submit the prompt 'agree'") || llamaMessage.includes('5016')) {
      try {
        await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: 'agree',
          image: [...new Uint8Array(bytes)]
        });
        agreed = true;
        
        aiRes = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the 7-digit check number, usually printed at the bottom-left corner, e.g. '2512612'. Do NOT use the longer bank routing or account numbers)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the handwritten issue date, usually in format DD/MM/YY or DD/MM/YYYY. Look in the bottom-right section, under the numerical amount box and next to the signature, following the pre-printed word 'le' or 'fait le', e.g. '10/09/20' should be extracted as '2020-09-10')"
}`,
          image: [...new Uint8Array(bytes)]
        });
      } catch (agreeErr) {
        // ignore
      }
    }

    if (!agreed || !aiRes) {
      const modelLlava = '@cf/llava-hf/llava-1.5-7b-hf';
      const systemPrompt = `Identify check details in this image. The check number (number) is always a 7-digit number, usually printed at the bottom-left corner (e.g. '2512612'). Do NOT use the longer account numbers. Look in the bottom-right section below the numerical amount box and next to the signature, following 'le' or 'fait le' for the handwritten issue date (e.g. '10/09/20' should be extracted as '2020-09-10'). Extract the pre-printed account holder name as emitter (e.g. 'ANTENNE REUNION TELEVISION', NOT the payee 'Association Sourice de l'enfant'). Output JSON format: {"number":"1234567", "amount":150.0, "emitter":"JEAN DUPONT", "bank":"LCL", "date":"2026-07-10"}`;

      aiRes = await ai.run(modelLlava, {
        prompt: systemPrompt,
        image: [...new Uint8Array(bytes)]
      });
    }
  }

  let extracted: ExtractedCheckFields = {};
  let textResult = '';
  if (typeof aiRes === 'string') {
    textResult = aiRes;
  } else if (aiRes && typeof aiRes === 'object') {
    const { response } = aiRes as { response?: unknown };
    if (typeof response === 'string') {
      textResult = response;
    } else if (response !== undefined && response !== null) {
      textResult = JSON.stringify(response);
    } else {
      textResult = JSON.stringify(aiRes);
    }
  }
  
  try {
    const jsonMatch = textResult.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      extracted = JSON.parse(textResult);
    }
  } catch (e) {
    extracted = {};
  }

  // fallback extraction regex
  if (!extracted.number) {
    const numMatch = textResult.match(/\b\d{7}\b/);
    if (numMatch) {
      extracted.number = numMatch[0];
    } else {
      const numMatchAny = textResult.match(/n°\s*(\d+)/i) || textResult.match(/numero\s*(\d+)/i);
      if (numMatchAny) extracted.number = numMatchAny[1];
    }
  }

  if (!extracted.amount) {
    const amtMatch = textResult.match(/(\d+[\.,]\d{2})\s*€/) || textResult.match(/(\d+[\.,]\d{2})\s*eur/i) || textResult.match(/(\d+)\s*€/) || textResult.match(/montant\s*(?:de\s*)?(\d+)/i);
    if (amtMatch) {
      extracted.amount = parseFloat(amtMatch[1].replace(',', '.'));
    }
  }

  if (!extracted.emitter) {
    const emitMatch = textResult.match(/émetteur\s*:\s*([A-Za-z\s\-]+)/i) || textResult.match(/de\s*([A-Z][a-z\-]+\s+[A-Z][a-z\-]+)/);
    if (emitMatch) {
      const val = emitMatch[1].trim();
      if (!/nozay/i.test(val) && !/bad/i.test(val) && !/association/i.test(val)) {
        extracted.emitter = val;
      }
    }
  }

  if (!extracted.bank) {
    const bankMatch = textResult.match(/banque\s*:\s*([A-Za-z\s]+)/i) || textResult.match(/(Société Générale|Crédit Agricole|LCL|Bred|BNP|La Banque Postale|CIC|Crédit Mutuel)/i);
    if (bankMatch) {
      extracted.bank = bankMatch[1].trim();
    }
  }

  if (!extracted.date) {
    const dateMatch = textResult.match(/(\d{2})[\/\-\s](\d{2})[\/\-\s](\d{2,4})/);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      let year = dateMatch[3];
      if (year.length === 2) {
        year = `20${year}`;
      }
      extracted.date = `${year}-${month}-${day}`;
    } else {
      const dateMatchISO = textResult.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (dateMatchISO) {
        extracted.date = dateMatchISO[0];
      }
    }
  }

  const repo = new RecordCheckTransactionRepository();
  let matchedMember = null;
  const members = await repo.getAllMembers(db);

  if (extracted.emitter) {
    const cleanEmitter = cleanName(extracted.emitter);
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
    number: extracted.number || '',
    amount: extracted.amount || 0,
    emitter: extracted.emitter || '',
    bank: extracted.bank || '',
    memberId: matchedMember ? matchedMember.id : null,
    memberName: matchedMember ? `${matchedMember.lastName} ${matchedMember.firstName}` : null,
    date: extracted.date || null
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

  /*
   * Ce chemin écrit lui aussi un `member_id` sur une écriture, sans passer par
   * `validateAccrualAndFiscalPhase` — le contrôle d'exercice s'y appelle donc en propre.
   * Un chèque de la rentrée déposé au nom de l'adhésion de l'année écoulée ferait disparaître
   * le règlement des deux dossiers, exactement comme un virement.
   */
  await assertMembershipMatchesSeason(db, body.memberId || null, seasonIdInt);

  // Phase 2 : Décision (en mémoire)
  const descStr = body.description || autoDescription(body.number, body.emitter);

  const stmtLedgerEntry = repo.buildCreateLedgerEntryStatement(db, {
    seasonId: seasonIdInt,
    type: 'recette',
    accountId: 1,
    category: categoryVal,
    amount: body.amount,
    date: body.date || new Date().toISOString().split('T')[0],
    paymentMethodId: 2,
    description: descStr,
    reference: `Chèque n°${body.number}`,
    memberId: body.memberId || null,
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
 * Pas de garde « saison clôturée » côté serveur, par cohérence avec la création et la
 * suppression qui ne l'ont pas ; l'écran masque les actions d'un exercice clos.
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
  if (existing.status === 'deposited') {
    throw new AppError("Un chèque déjà remis en banque ne se modifie plus : supprimez d'abord le bordereau.", 400);
  }

  const memberId = body.memberId ?? null;
  await assertMembershipMatchesSeason(db, memberId, existing.seasonId);

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
