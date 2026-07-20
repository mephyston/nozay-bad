import { eq } from 'drizzle-orm';
import { seasonsTable } from './schema';

/**
 * Domain helper: check whether a season is closed.
 * Belongs to the `members` domain — canonical owner of `seasonsTable`.
 */
export async function isSeasonClosed(db: any, seasonId: string): Promise<boolean> {
  const season = await db
    .select({ closed: seasonsTable.closed })
    .from(seasonsTable)
    .where(eq(seasonsTable.id, seasonId))
    .get();
  return season?.closed === 1 || season?.closed === true;
}
