import { type Db, type Tx } from '@nba/db';
import { ImportBankStatementRepository } from './repository';
import { ParseOFXInput, ParseOFXOutput } from "./dto";

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
    const dateFormatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;

    transactions.push({
      fitid: fitidMatch[1].trim(),
      accountId,
      amount: amountCents,
      date: dateFormatted,
      name: nameMatch[1].trim(),
      memo: memoMatch ? memoMatch[1].trim() : null
    });
  }

  return { transactions };
}

export async function importBankStatement(db: Db, fileContent: string, seasonId: string, forcedAccountId: string) {
  const { transactions } = parseOFX(fileContent);
  if (transactions.length === 0) {
    return { count: 0 };
  }

  const repo = new ImportBankStatementRepository();
  let insertedCount = 0;

  const runSequential = async (txDb: Tx) => {
    let count = 0;
    for (const tx of transactions) {
      const targetAccount = (forcedAccountId && forcedAccountId !== 'auto') 
        ? (forcedAccountId as 'current' | 'savings') 
        : tx.accountId;

      const res = await repo.insertBankTransaction(txDb, {
        fitid: tx.fitid,
        seasonId,
        accountId: targetAccount,
        amount: tx.amount,
        date: tx.date,
        name: tx.name,
        memo: tx.memo,
        status: 'pending',
        createdAt: new Date()
      });
      if (res.changes > 0) {
        count++;
      }
    }
    return count;
  };

  try {
    insertedCount = await db.transaction(async (txDb: Tx) => {
      return runSequential(txDb);
    });
  } catch (err: unknown) {
    if (err.message && err.message.includes('begin')) {
      insertedCount = await runSequential(db);
    } else {
      throw err;
    }
  }

  return { count: insertedCount };
}
