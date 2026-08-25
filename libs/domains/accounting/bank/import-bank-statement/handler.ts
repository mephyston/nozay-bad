import { type Db, AppError } from '@nba/db';
import { ImportBankStatementRepository } from './repository';
import { ParseOFXInput, ParseOFXOutput, ParsedStatementBalance, ParsedStatementIssue, ImportBankStatementOutput } from "./dto";

/** `YYYYMMDD…` → `YYYY-MM-DD`. Le fichier suffixe parfois l'heure et le fuseau : on les jette. */
function toIsoDate(rawDate: string): string {
  return `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
}

/**
 * Le solde annoncé par la banque, lu dans le bloc `<LEDGERBAL>`.
 *
 * Cette donnée était jusqu'ici jetée : on ne lisait que les `<STMTTRN>`, c'est-à-dire les
 * mouvements. Sans elle, on peut pointer les opérations une à une mais jamais boucler un état
 * de rapprochement, faute d'un nombre venu de l'extérieur auquel confronter les livres.
 *
 * `<AVAILBAL>`, que certaines banques ajoutent, est délibérément ignoré : c'est un solde
 * *disponible*, déduction faite des autorisations en cours, qui ne correspond à aucun arrêté
 * comptable et ne se rapproche donc de rien.
 */
export function parseLedgerBalance(ofxContent: string): ParsedStatementBalance | null {
  const blockMatch = ofxContent.match(/<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|$)/);
  if (!blockMatch) return null;

  const block = blockMatch[1];
  const amountMatch = block.match(/<BALAMT>([^\r\n<]+)/);
  const dateMatch = block.match(/<DTASOF>([^\r\n<]+)/);
  if (!amountMatch || !dateMatch) return null;

  const rawAmount = parseFloat(amountMatch[1].trim());
  if (isNaN(rawAmount)) return null;

  const rawDate = dateMatch[1].trim();
  if (rawDate.length < 8) return null;

  return { date: toIsoDate(rawDate), balanceCents: Math.round(rawAmount * 100) };
}

/**
 * Ce qui suit la fermeture d'un bloc et ressemble encore à une opération.
 *
 * Le découpage sur `<STMTTRN>` ne retient que le PREMIER jeu de champs de chaque morceau. Une
 * opération dont la balise ouvrante manque se retrouve donc accolée à la fin de la précédente
 * et n'est jamais lue — sans erreur, sans compteur, sans rien. On la nomme ici pour que
 * l'import puisse refuser le fichier au lieu de l'avaler.
 */
function detectSwallowedOperation(tail: string): ParsedStatementIssue | null {
  if (!/<TRNAMT>/.test(tail) && !/<FITID>/.test(tail)) return null;

  const amount = tail.match(/<TRNAMT>(-?[\d.]+)/);
  const date = tail.match(/<DTPOSTED>(\d{8})/);
  const fitid = tail.match(/<FITID>([^\r\n<]+)/);
  const name = tail.match(/<NAME>([^\r\n<]+)/);

  return {
    date: date ? toIsoDate(date[1]) : null,
    amountCents: amount ? Math.round(parseFloat(amount[1]) * 100) : null,
    fitid: fitid ? fitid[1].trim() : null,
    name: name ? name[1].trim() : null
  };
}

export function parseOFX(ofxContent: string): ParseOFXOutput {
  const acctIdMatch = ofxContent.match(/<ACCTID>([^\r\n<]+)/);
  const acctId = acctIdMatch ? acctIdMatch[1].trim() : '';
  const accountId: 'current' | 'savings' = acctId === '00070007847' ? 'savings' : 'current';

  const transactions: any[] = [];
  const issues: ParsedStatementIssue[] = [];
  const blocks = ofxContent.split('<STMTTRN>');
  for (let i = 1; i < blocks.length; i++) {
    const [block, ...rest] = blocks[i].split('</STMTTRN>');
    const swallowed = detectSwallowedOperation(rest.join('</STMTTRN>'));
    if (swallowed) issues.push(swallowed);

    const fitidMatch = block.match(/<FITID>([^\r\n<]+)/);
    const trnamtMatch = block.match(/<TRNAMT>([^\r\n<]+)/);
    const dtpostedMatch = block.match(/<DTPOSTED>([^\r\n<]+)/);
    const nameMatch = block.match(/<NAME>([^\r\n<]+)/);
    const memoMatch = block.match(/<MEMO>([^\r\n<]+)/);

    if (!fitidMatch || !trnamtMatch || !dtpostedMatch || !nameMatch) continue;

    const rawAmount = parseFloat(trnamtMatch[1].trim());
    const amountCents = Math.round(rawAmount * 100);

    const rawDate = dtpostedMatch[1].trim();
    const dateFormatted = toIsoDate(rawDate);

    transactions.push({
      fitid: fitidMatch[1].trim(),
      accountId,
      amountCents,
      date: dateFormatted,
      name: nameMatch[1].trim(),
      memo: memoMatch ? memoMatch[1].trim() : null
    });
  }

  return { transactions, balance: parseLedgerBalance(ofxContent), issues };
}

/** « le 16/09/2025, 60,07 € (GEN-2526-067) » — de quoi retrouver la ligne dans le fichier. */
function describeIssue(issue: ParsedStatementIssue): string {
  const parts: string[] = [];
  if (issue.date) parts.push(`le ${issue.date.split('-').reverse().join('/')}`);
  if (issue.amountCents !== null) parts.push(`${(issue.amountCents / 100).toFixed(2)} €`);
  if (issue.name) parts.push(`« ${issue.name} »`);
  if (issue.fitid) parts.push(`(${issue.fitid})`);
  return parts.join(' ') || 'opération non identifiable';
}

export async function importBankStatement(db: Db, fileContent: string, forcedAccountId?: string): Promise<ImportBankStatementOutput> {
  const { transactions, balance, issues } = parseOFX(fileContent);

  /*
   * Un fichier dont un bloc ne s'ouvre pas est refusé EN ENTIER, et nommément.
   *
   * L'import pourrait charger les opérations lisibles et se taire sur les autres. C'est
   * exactement ce qu'il faisait, et une dépense de 120 € a manqué aux comptes pendant huit mois
   * sans que rien ne le signale. Un relevé partiellement lu n'est pas un relevé : mieux vaut
   * rendre la main en disant quoi corriger. Le fichier réparé se réimporte sans risque, les
   * lignes déjà connues étant reconnues à leur identifiant.
   */
  if (issues.length > 0) {
    const details = issues.slice(0, 5).map(describeIssue).join(' ; ');
    const reste = issues.length > 5 ? ` (et ${issues.length - 5} autre(s))` : '';
    throw new AppError(
      `Fichier illisible : ${issues.length} opération(s) hors de tout bloc <STMTTRN>, donc invisibles à l'import — ${details}${reste}. ` +
      `Corrigez la balise ouvrante manquante puis réimportez : aucune opération n'a été chargée.`,
      400
    );
  }

  const repo = new ImportBankStatementRepository();

  /*
   * Le compte de destination se résout UNE fois, en identifiant.
   *
   * `bank_statement_lines.account_id` est une clé étrangère numérique, mais l'import lui
   * passait le code (`'current'` / `'savings'`) et le dépôt repliait tout ce qui n'était pas
   * un nombre sur `1`. Un relevé de livret atterrissait donc sur le compte courant, sans la
   * moindre erreur — et le rapprochement d'un compte contre les lignes d'un autre ne pouvait
   * pas boucler.
   */
  const requestedCode = (forcedAccountId && forcedAccountId !== 'auto')
    ? forcedAccountId
    : (transactions[0]?.accountId ?? 'current');
  const account = await repo.getAccountByCode(db, requestedCode);
  if (!account) {
    throw new Error(`Compte de trésorerie « ${requestedCode} » introuvable.`);
  }

  let insertedCount = 0;
  for (const tx of transactions) {
    const res = await repo.insertBankStatementLine(db, {
      fitid: tx.fitid,
      accountId: account.id,
      amountCents: tx.amountCents,
      date: tx.date,
      name: tx.name,
      memo: tx.memo,
      status: 'pending',
      createdAt: new Date()
    });
    if (res.changes > 0) {
      insertedCount++;
    }
  }

  /*
   * Le solde s'enregistre même quand le fichier n'apporte aucun mouvement nouveau : c'est
   * justement le cas d'un relevé réimporté, et l'arrêté le plus récent est celui qui sert au
   * rapprochement.
   */
  let balanceRecorded = false;
  if (balance) {
    await repo.upsertBankStatementBalance(db, {
      accountId: account.id,
      date: balance.date,
      balanceCents: balance.balanceCents,
      createdAt: new Date()
    });
    balanceRecorded = true;
  }

  return {
    count: insertedCount,
    read: transactions.length,
    inserted: insertedCount,
    /*
     * Ce que l'import a délibérément laissé de côté. Le silence sur ce nombre est ce qui a
     * permis à un identifiant réutilisé de faire disparaître une opération sans trace :
     * `onConflictDoNothing` ne distingue pas « déjà connue » de « perdue ».
     */
    skipped: transactions.length - insertedCount,
    accountId: account.id,
    accountCode: account.code,
    balanceRecorded,
    balanceDate: balance?.date ?? null,
    balanceCents: balance?.balanceCents ?? null
  };
}
