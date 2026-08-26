import { AppError, type Db } from '@nba/db';
import { UpdateBankStatementLineStatusRepository } from './repository';
import type { UpdateBankStatementLineStatusInput, UpdateBankStatementLineStatusesInput } from './dto';

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

/** Le même changement pour un lot de lignes. Renvoie les identifiants traités, pour l'écran. */
export async function updateBankStatementLineStatuses(db: Db, input: UpdateBankStatementLineStatusesInput): Promise<{ ids: number[]; status: 'pending' | 'ignored' }> {
  const repo = new UpdateBankStatementLineStatusRepository();
  const ids = Array.from(new Set((input.ids ?? []).filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length === 0) {
    throw new AppError('Aucune ligne de relevé désignée.', 400);
  }
  assertStatus(input.status);
  await repo.updateStatuses(db, ids, input.status);
  return { ids, status: input.status };
}
