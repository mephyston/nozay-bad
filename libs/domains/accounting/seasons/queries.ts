import { seasonsTable } from '@nba/accounting/schema';
import { eq, inArray, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';

export async function getSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number | undefined> {
  let numericId = Number(seasonIdOrCode);
  if (!isNaN(numericId)) {
    return numericId;
  }
  const s = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, String(seasonIdOrCode))).get();
  return s?.id;
}

export async function isSeasonClosed(db: DbOrTx, seasonId: string | number): Promise<boolean> {
  const numericId = Number(seasonId);
  const condition = !isNaN(numericId)
    ? or(eq(seasonsTable.id, numericId), eq(seasonsTable.code, String(seasonId)))
    : eq(seasonsTable.code, String(seasonId));

  const season = await db
    .select({ closedAt: seasonsTable.closedAt })
    .from(seasonsTable)
    .where(condition)
    .get();
  return Boolean(season?.closedAt);
}

export async function insertSeasons(db: DbOrTx, seasons: (typeof seasonsTable.$inferInsert)[]): Promise<void> {
  if (!seasons.length) return;
  await db.insert(seasonsTable).values(seasons).onConflictDoNothing();
}

export async function getSeasonsByCodes(db: DbOrTx, seasonCodes: string[]): Promise<{ id: number, code: string }[]> {
  if (!seasonCodes.length) return [];
  return db.select({ id: seasonsTable.id, code: seasonsTable.code }).from(seasonsTable).where(inArray(seasonsTable.code, seasonCodes)).all();
}

export async function getAllSeasons(db: DbOrTx) {
  return db.select().from(seasonsTable).all();
}

export async function getSeasonByCode(db: DbOrTx, code: string): Promise<{ id: number } | undefined> {
  return db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, code)).get();
}

export async function getSeasonById(db: DbOrTx, id: number) {
  return db.select().from(seasonsTable).where(eq(seasonsTable.id, id)).get();
}
