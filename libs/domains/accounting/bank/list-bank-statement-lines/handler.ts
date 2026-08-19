import { type Db } from '@nba/db';
import { ListBankStatementLinesRepository } from './repository';
import type { ListBankStatementLinesInput, ListBankStatementLinesOutput } from './dto';

export async function listBankStatementLines(db: Db, input: ListBankStatementLinesInput): Promise<ListBankStatementLinesOutput> {
  const repo = new ListBankStatementLinesRepository();
  const rawLines = await repo.listBankStatementLines(db, input.seasonId, input as any);

  return rawLines.map(line => {
    const cents = line.amountCents ?? (line as any).amount ?? 0;
    return {
      ...line,
      amount: cents,
      amountCents: cents
    };
  }) as any;
}
