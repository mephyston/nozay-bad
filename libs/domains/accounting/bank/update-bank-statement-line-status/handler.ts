import { type Db } from '@nba/db';
import { UpdateBankStatementLineStatusRepository } from './repository';
import type { UpdateBankStatementLineStatusInput } from './dto';

function assertStatus(status: string): asserts status is 'pending' | 'ignored' {
  if (status !== 'pending' && status !== 'ignored') {
    throw new Error('Invalid status');
  }
}

export async function updateBankStatementLineStatus(db: Db, input: UpdateBankStatementLineStatusInput): Promise<void> {
  const repo = new UpdateBankStatementLineStatusRepository();
  if (!input.id) {
    throw new Error('Transaction ID is required');
  }
  assertStatus(input.status);
  await repo.updateStatus(db, input.id, input.status);
}
