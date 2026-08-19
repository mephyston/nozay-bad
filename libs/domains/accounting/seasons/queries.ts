import { seasonsTable } from '@nba/accounting/schema';
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, or } from 'drizzle-orm';
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

// Retourne l'id de la saison marquée active (flag `active`), ou undefined si aucune.
//
// ATTENTION : ce drapeau est un outil COMPTABLE. Le bureau le bascule au moment qui
// l'arrange pour la clôture, à une date qui n'a aucune raison de coïncider avec le début
// de saison. Ne pas s'en servir pour décider d'un droit d'accès — voir
// `getSeasonAtDate()`, qui s'appuie sur les dates de la saison et bascule toute seule.
export async function getActiveSeasonId(db: DbOrTx): Promise<number | undefined> {
  const s = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.active, true)).get();
  return s?.id;
}

export type SeasonRow = typeof seasonsTable.$inferSelect;

/**
 * Saison dont la fenêtre de dates contient `date` (format `YYYY-MM-DD`), ou undefined si
 * aucune ne la couvre. Les dates étant stockées en `YYYY-MM-DD`, la comparaison
 * lexicographique de SQLite coïncide avec l'ordre chronologique.
 *
 * C'est la référence pour tout ce qui relève d'un droit (accès adhérent au storefront) :
 * contrairement au drapeau `active`, elle bascule d'elle-même au 1er septembre.
 */
export async function getSeasonAtDate(db: DbOrTx, date: string): Promise<SeasonRow | undefined> {
  return db
    .select()
    .from(seasonsTable)
    .where(and(lte(seasonsTable.startDate, date), gte(seasonsTable.endDate, date)))
    .orderBy(asc(seasonsTable.startDate))
    .get();
}

/**
 * Saison immédiatement voisine de `startDate` : la plus récente qui commence avant
 * (`before`), ou la plus proche qui commence après (`after`). Sert à ne regarder qu'UNE
 * saison de part et d'autre de la saison courante — au-delà d'un an d'écart, un dossier
 * n'est plus un renouvellement.
 */
export async function getAdjacentSeason(
  db: DbOrTx,
  startDate: string,
  direction: 'before' | 'after'
): Promise<SeasonRow | undefined> {
  return db
    .select()
    .from(seasonsTable)
    .where(
      direction === 'before'
        ? lt(seasonsTable.startDate, startDate)
        : gt(seasonsTable.startDate, startDate)
    )
    .orderBy(direction === 'before' ? desc(seasonsTable.startDate) : asc(seasonsTable.startDate))
    .get();
}
