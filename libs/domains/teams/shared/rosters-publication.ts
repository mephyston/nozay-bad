import { and, eq, isNotNull } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { championshipSettingsTable } from './schema';
import type { Championship } from './championship';

/**
 * Qui lit : le bureau dans l'administration, ou un adhérent dans son espace.
 *
 * Déduit de `x-caller` par la route, jamais d'un paramètre : un paramètre oublié par
 * l'appelant ne doit pas suffire à montrer un brouillon (même parti que le CMS).
 */
export type Audience = 'staff' | 'members';

export function audienceOf(caller: string | undefined): Audience {
  return caller === 'admin' ? 'staff' : 'members';
}

/**
 * Les championnats dont le coach a publié les effectifs, pour une saison.
 *
 * Tant qu'un championnat n'y figure pas, l'espace adhérent n'en montre ni l'effectif ni
 * le staff, et personne n'y compose : ce sont les essais du coach. Une seule lecture par
 * appel, l'ensemble se consulte ensuite équipe par équipe.
 */
export async function publishedChampionships(db: DbOrTx, seasonCode: string): Promise<Set<Championship>> {
  const rows = await db
    .select({ championship: championshipSettingsTable.championship })
    .from(championshipSettingsTable)
    .where(and(eq(championshipSettingsTable.seasonCode, seasonCode), isNotNull(championshipSettingsTable.rostersPublishedAt)))
    .all();
  return new Set(rows.map((row) => row.championship));
}

export async function areRostersPublished(
  db: DbOrTx,
  team: { seasonCode: string; championship: Championship }
): Promise<boolean> {
  return (await publishedChampionships(db, team.seasonCode)).has(team.championship);
}
