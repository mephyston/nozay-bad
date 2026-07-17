import { eq } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Lightweight seasons table schema locally defined to comply with Nx boundary rules
const seasonsTable = sqliteTable('seasons', {
  id: text('id').primaryKey(),
  closed: integer('closed', { mode: 'boolean' }).notNull().default(false),
});

/**
 * Shared helper: check whether a season is closed.
 * Centralised here to avoid duplication across accounting, expenses, and shop modules.
 */
export async function isSeasonClosed(db: any, seasonId: string): Promise<boolean> {
  const season = await db
    .select({ closed: seasonsTable.closed })
    .from(seasonsTable)
    .where(eq(seasonsTable.id, seasonId))
    .get();
  return season?.closed === 1 || season?.closed === true;
}

/**
 * Shared helper: normalise a category value to its numeric ID.
 * Supports both numeric IDs and legacy string keys from older imports.
 */
export function normalizeCategory(categoryVal: unknown): number | null {
  if (categoryVal === undefined || categoryVal === null) return null;
  const num = Number(categoryVal);
  if (!isNaN(num)) return num;

  const legacyMap: Record<string, number> = {
    adhesions_inscriptions: 1,
    sponsoring: 2,
    subventions: 3,
    actions_jeunes: 4,
    tournois_senior: 5,
    evenements_buvettes: 6,
    cordage_vente: 7,
    volants: 8,
    salaires_charges: 9,
    materiel_club: 10,
    licences_federation: 11,
    championnats: 12,
    stages_formations: 13,
    fonctionnement_administratif: 14,
  };
  return legacyMap[categoryVal as string] ?? null;
}
