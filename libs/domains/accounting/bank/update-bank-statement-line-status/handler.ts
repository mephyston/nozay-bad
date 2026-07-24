import { type Db } from '@nba/db';
import { UpdateBankStatementLineStatusRepository } from './repository';
import type { UpdateBankStatementLineStatusInput } from './dto';

export async function updateBankStatementLineStatus(db: Db, input: UpdateBankStatementLineStatusInput): Promise<void> {
  const repo = new UpdateBankStatementLineStatusRepository();
  if (!input.id) {
    throw new Error('Transaction ID is required');
  }
  if (input.status !== 'pending' && input.status !== 'ignored') {
    throw new Error('Invalid status');
  }
  await repo.updateStatus(db, input.id, input.status);
}
