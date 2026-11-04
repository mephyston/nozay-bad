import { type DbOrTx } from '@nba/db';
import { DeleteCalendarFeedRepository } from './repository';

const repo = new DeleteCalendarFeedRepository();

/** Coupe l'abonnement. Sans abonnement, il n'y a rien à faire et ce n'est pas une erreur. */
export async function deleteCalendarFeed(db: DbOrTx, licence: string): Promise<void> {
  await repo.delete(db, licence);
}
