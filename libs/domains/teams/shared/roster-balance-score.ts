import type { ValueRange } from './value-range';

/** Licence → identifiant de l'équipe. */
export type Repartition = Map<string, number>;

/** Une équipe qui ne remplit pas sa rencontre pèse plus que tout chevauchement. */
export const PENALITE_INCOMPLETE = 100;
/** Un dépassement inévitable pèse dix fois un simple chevauchement. */
export const POIDS_CONFLIT = 10;
/** Un mouvement de plus ne départage que deux répartitions par ailleurs égales. */
export const POIDS_MOUVEMENT = 0.001;

/**
 * Le score d'une répartition : plus il est bas, mieux c'est.
 *
 * - Chaque équipe incomplète (plage `null`) coûte `PENALITE_INCOMPLETE`.
 * - Entre deux équipes voisines, ce que la plage du dessous empiète sur celle du
 *   dessus (son maximum au-delà du minimum du dessus), et dix fois ce que même sa
 *   compo la plus faible dépasse la plus forte du dessus.
 * - Chaque joueur qui change d'équipe coûte un millième : à chevauchement égal, la
 *   répartition qui bouscule le moins l'emporte.
 */
export function scoreDeRepartition<P extends { licence: string }>(
  rep: Repartition,
  ordre: Array<{ id: number }>,
  joueurs: P[],
  plage: (teamId: number, membres: P[]) => ValueRange | null,
  actuel: Map<string, number | null>,
  hierarchie: boolean
): { score: number; ranges: Map<number, ValueRange | null> } {
  const ranges = new Map(
    ordre.map((t) => [t.id, plage(t.id, joueurs.filter((p) => rep.get(p.licence) === t.id))])
  );
  let score = 0;
  for (const [i, t] of ordre.entries()) {
    const r = ranges.get(t.id) ?? null;
    if (!r) {
      score += PENALITE_INCOMPLETE;
      continue;
    }
    const dessus = i > 0 ? ranges.get(ordre[i - 1].id) : null;
    if (hierarchie && dessus) {
      score += Math.max(0, r.max - dessus.min);
      score += POIDS_CONFLIT * Math.max(0, r.min - dessus.max);
    }
  }
  for (const p of joueurs) if (actuel.get(p.licence) !== rep.get(p.licence)) score += POIDS_MOUVEMENT;
  return { score, ranges };
}
