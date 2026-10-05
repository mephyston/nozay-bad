import type { LineupCandidate } from '../../get-lineup/dto';
import { DISCIPLINE_RANKING, rankingStrength, type Discipline } from '../../shared/ranking';
import { cpphOf, rankingOf } from '../../shared/player';

/** Force d'un candidat sur un tableau ; `-1` pour un non-compétiteur, sous `NC` qui vaut 0. */
const force = (c: LineupCandidate, discipline: Discipline): number => {
  const ranking = rankingOf(c, DISCIPLINE_RANKING[discipline]);
  return ranking === null ? -1 : rankingStrength(ranking);
};

/**
 * Les candidats d'un tableau, du mieux classé au moins bien classé **dans la discipline
 * de ce tableau** : simple pour SH/SD, double pour DH/DD, mixte pour MX.
 *
 * C'est l'ordre dans lequel le capitaine place ses joueurs (art. 6.2.2) : le premier de
 * la liste va en SH1, le suivant en SH2. À classement égal, la cote CPPH départage, puis
 * le nom. Un joueur sans cote passe après ceux qui en ont une.
 *
 * L'effectif seul est proposé (`inRoster` toujours vrai) : le tri n'a donc pas à le
 * placer devant d'autres candidats. S'il en revenait, il faudrait l'ajouter en tête.
 */
export function trierParClassement(candidates: readonly LineupCandidate[], discipline: Discipline): LineupCandidate[] {
  const ranked = DISCIPLINE_RANKING[discipline];
  return [...candidates].sort(
    (a, b) =>
      force(b, discipline) - force(a, discipline) ||
      (cpphOf(b, ranked) ?? -Infinity) - (cpphOf(a, ranked) ?? -Infinity) ||
      a.lastName.localeCompare(b.lastName, 'fr') ||
      a.firstName.localeCompare(b.firstName, 'fr')
  );
}
