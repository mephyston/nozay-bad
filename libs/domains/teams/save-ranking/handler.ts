import { type DbOrTx } from '@nba/db';
import { normalizeLicence } from '../shared/ranking';
import { RankingNotFoundError } from '../shared/errors';
import { SaveRankingRepository } from './repository';
import type { SaveRankingInput, SaveRankingOutput } from './dto';

const repo = new SaveRankingRepository();

/**
 * Corrige un classement à la main.
 *
 * L'export Poona n'est pas infaillible — un reclassement tardif, une licence rattachée
 * après coup — et le coach doit pouvoir rétablir la vérité sans attendre le prochain
 * export. La ligne passe alors en source `manuel`, ce que l'écran affiche : une valeur
 * d'équipe calculée sur une donnée saisie à la main doit pouvoir être questionnée.
 *
 * **La correction ne touche que l'instantané visé.** Écrire sur une date antérieure
 * changerait rétroactivement toutes les journées qui la résolvent comme référence, et
 * donc la conformité de compositions déjà validées. Un instantané est un fait daté ; on
 * le corrige là où il est faux, jamais ailleurs.
 */
export async function saveRanking(
  db: DbOrTx,
  input: SaveRankingInput,
  now: Date = new Date()
): Promise<SaveRankingOutput> {
  const licence = normalizeLicence(input.licence);
  const row = await repo.findAt(db, licence, input.eloDate);
  if (!row) throw new RankingNotFoundError();

  // Seules les clés réellement envoyées sont écrites : une clé absente laisse la valeur
  // en place, là où `null` l'efface pour dire « non compétiteur ».
  const values: Partial<typeof row> = { source: 'manuel', updatedAt: now };
  for (const key of ['singles', 'doubles', 'mixed', 'cpphSingles', 'cpphDoubles', 'cpphMixed'] as const) {
    if (input[key] !== undefined) Object.assign(values, { [key]: input[key] });
  }

  const saved = await repo.update(db, row.id, values);

  return {
    licence: saved.licence,
    eloDate: saved.eloDate,
    singles: saved.singles,
    doubles: saved.doubles,
    mixed: saved.mixed,
    cpphSingles: saved.cpphSingles,
    cpphDoubles: saved.cpphDoubles,
    cpphMixed: saved.cpphMixed,
    source: saved.source
  };
}
