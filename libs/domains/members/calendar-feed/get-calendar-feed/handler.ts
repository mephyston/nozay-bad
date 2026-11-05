import { type DbOrTx } from '@nba/db';
import { GetCalendarFeedRepository } from './repository';
import type { GetCalendarFeedOutput } from './dto';

const repo = new GetCalendarFeedRepository();

/** L'abonnement existe-t-il ? L'adresse, elle, ne se relit pas : seule son empreinte est gardée. */
export async function getCalendarFeed(db: DbOrTx, licence: string): Promise<GetCalendarFeedOutput> {
  const createdAt = await repo.createdAt(db, licence);
  return { subscribed: createdAt !== undefined, createdAt: createdAt ?? null };
}
