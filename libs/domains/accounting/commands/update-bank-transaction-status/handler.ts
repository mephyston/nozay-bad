import { UpdateBankTransactionStatusRepository } from './repository';
import type { UpdateBankTransactionStatusInput } from './dto';

export async function updateBankTransactionStatus(db: any, input: UpdateBankTransactionStatusInput): Promise<void> {
  const repo = new UpdateBankTransactionStatusRepository();
  if (!input.id) {
    throw new Error('Transaction ID is required');
  }
  if (input.status !== 'pending' && input.status !== 'ignored') {
    throw new Error('Invalid status');
  }
  await repo.updateStatus(db, input.id, input.status);
}
