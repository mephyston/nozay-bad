import { type Db } from '@nba/db';
import { ImportBankStatementRepository } from './repository';
import { ParseOFXInput, ParseOFXOutput, ParsedStatementBalance } from "./dto";

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

export function parseOFX(ofxContent: string): ParseOFXOutput {
  const acctIdMatch = ofxContent.match(/<ACCTID>([^\r\n<]+)/);
  const acctId = acctIdMatch ? acctIdMatch[1].trim() : '';
  const accountId: 'current' | 'savings' = acctId === '00070007847' ? 'savings' : 'current';

  const transactions: any[] = [];
  const blocks = ofxContent.split('<STMTTRN>');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('</STMTTRN>')[0];

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

  return { transactions, balance: parseLedgerBalance(ofxContent) };
}

export async function importBankStatement(db: Db, fileContent: string, forcedAccountId?: string) {
  const { transactions, balance } = parseOFX(fileContent);

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
    accountId: account.id,
    accountCode: account.code,
    balanceRecorded,
    balanceDate: balance?.date ?? null,
    balanceCents: balance?.balanceCents ?? null
  };
}
