import { AppError, type Db } from '@nba/db';
import { findHandover } from '../../shared/cash-store';
import { CancelCashHandoverRepository } from './repository';

/** Une remise abandonnée avant signature : les reçus restent en main de l'encaisseur. */
export async function cancelCashHandover(db: Db, id: number): Promise<void> {
  const h = await findHandover(db, id);
  if (!h) throw new AppError('Remise introuvable.', 404);
  if (h.status !== 'pending') throw new AppError('Une remise signée ne s’annule pas.', 409);
  await new CancelCashHandoverRepository().cancel(db, id);
}
