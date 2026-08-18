import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES } from '../shared/championship';
import { shiftIsoDate } from '../shared/ranking-resolution';
import { findActiveChampionships, findDaysByWeekStart } from './repository';
import type { RankingReminderDay } from './dto';

/**
 * Journées dont le classement de référence est publié aujourd'hui.
 *
 * En régional, le classement applicable à une journée est celui du **jeudi qui la
 * précède** (art. 4.4.2) : `thursdayBefore(weekStart) = weekStart − 4 jours`. Plutôt
 * que de tester le jour de la semaine, on cherche les journées dont le lundi tombe
 * dans quatre jours — seuls les jeudis peuvent matcher, `week_start` étant normalisé
 * au lundi à l'écriture.
 *
 * Filtres :
 *   * championnats à classement **par journée** (`rankingPolicy: 'per_day'`, l'ICR
 *     aujourd'hui) — le départemental joue toute la saison sur une date fixe, un
 *     import hebdomadaire n'y changerait rien ;
 *   * championnats où le club aligne au moins une équipe active — pas d'équipe,
 *     personne à protéger d'un classement périmé.
 */
export async function findRankingReminderDays(
  db: DbOrTx,
  seasonCode: string,
  parisToday: string
): Promise<RankingReminderDay[]> {
  const weekStart = shiftIsoDate(parisToday, 4);
  const days = await findDaysByWeekStart(db, seasonCode, weekStart);
  if (days.length === 0) return [];

  const activeChampionships = await findActiveChampionships(db, seasonCode);

  return days
    .filter(
      (day) =>
        CHAMPIONSHIP_RULES[day.championship].rankingPolicy === 'per_day' &&
        activeChampionships.has(day.championship)
    )
    .map((day) => ({
      championship: day.championship,
      championshipLabel: CHAMPIONSHIP_RULES[day.championship].label,
      dayId: day.id,
      dayNumber: day.number,
      dayLabel: day.label,
      weekStart: day.weekStart
    }));
}
