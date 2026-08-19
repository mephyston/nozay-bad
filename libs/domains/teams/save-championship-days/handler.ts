import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES } from '../shared/championship';
import { mondayOf, sundayOf } from '../shared/week';
import { InvalidLineupError, UnknownChampionshipError } from '../shared/errors';
import { SaveChampionshipDaysRepository } from './repository';
import type { SaveChampionshipDaysInput, SaveChampionshipDaysOutput } from './dto';

const repo = new SaveChampionshipDaysRepository();

/**
 * Enregistre le calendrier des journées d'un championnat.
 *
 * Deux points portent tout le poids de cette fonction.
 *
 * **La normalisation au lundi.** Chaque championnat numérote ses journées pour lui seul —
 * la J1 du régional et celle du mixte sont deux dates sans rapport — et c'est la *semaine*
 * qui les relie : un joueur ne tient qu'une équipe du club par semaine, mixte, masculin et
 * régional confondus. Le lundi est donc la clé de jointure, et une date qui n'y serait pas
 * ramenée ferait échouer la comparaison entre championnats, laissant passer un double
 * alignement — l'infraction qui fait perdre la rencontre à toutes les équipes concernées.
 *
 * **L'unicité des semaines.** Deux journées d'un même championnat dans la même semaine
 * rendraient la règle « une seule équipe par journée » inapplicable : on ne saurait plus
 * de laquelle on parle.
 */
export async function saveChampionshipDays(
  db: DbOrTx,
  input: SaveChampionshipDaysInput,
  now: Date = new Date()
): Promise<SaveChampionshipDaysOutput> {
  const rules = CHAMPIONSHIP_RULES[input.championship];
  if (!rules) throw new UnknownChampionshipError();

  const normalized = input.days.map((day) => ({
    number: day.number,
    weekStart: mondayOf(day.weekStart),
    weekEnd: sundayOf(day.weekStart),
    // Le jour de jeu, quand il est fixé, doit tomber dans la semaine de la journée :
    // ailleurs, ce n'est plus un jour de jeu mais un report, qui se saisit sur la
    // rencontre et non sur le calendrier du comité.
    matchDate: day.matchDate && mondayOf(day.matchDate) === mondayOf(day.weekStart)
      ? day.matchDate
      : null,
    kind: day.kind ?? ('regular' as const),
    label: day.label ?? null,
    referenceEloDate: day.referenceEloDate ?? null
  }));

  const numbers = new Set<number>();
  const weeks = new Set<string>();
  for (const day of normalized) {
    if (numbers.has(day.number)) {
      throw new InvalidLineupError(`La journée J${day.number} est présente deux fois.`);
    }
    if (weeks.has(day.weekStart)) {
      throw new InvalidLineupError(
        `Deux journées tombent la semaine du ${day.weekStart} : une journée est une semaine, elles ne peuvent pas se confondre.`
      );
    }
    numbers.add(day.number);
    weeks.add(day.weekStart);
  }

  for (const day of normalized) {
    await repo.upsert(db, {
      seasonCode: input.seasonCode,
      championship: input.championship,
      number: day.number,
      weekStart: day.weekStart,
      weekEnd: day.weekEnd,
      matchDate: day.matchDate,
      kind: day.kind,
      label: day.label,
      referenceEloDate: day.referenceEloDate,
      createdAt: now
    });
  }

  await repo.removeMissing(db, input.seasonCode, input.championship, [...numbers]);

  return {
    seasonCode: input.seasonCode,
    championship: input.championship,
    count: normalized.length
  };
}
