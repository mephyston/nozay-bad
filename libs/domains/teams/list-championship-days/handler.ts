import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES, type Championship } from '../shared/championship';
import { weeklyExclusionGroup } from '../shared/week';
import { UnknownChampionshipError } from '../shared/errors';
import { ListChampionshipDaysRepository } from './repository';
import type { ListChampionshipDaysOutput } from './dto';

const repo = new ListChampionshipDaysRepository();

/**
 * Le calendrier d'un championnat, chaque journée sachant qui joue la même semaine.
 *
 * `concurrentChampionships` est ce qui rend la contrainte visible dans l'écran : le coach
 * doit voir que la J3 du mixte tombe la même semaine que la J5 du masculin, sans quoi
 * rien ne le lui signalerait — les numéros ne se ressemblent pas. Seuls les championnats
 * du même groupe d'exclusion sont retenus : les vétérans cohabitent librement avec les
 * autres, leur règlement ne les citant pas.
 */
export async function listChampionshipDays(
  db: DbOrTx,
  seasonCode: string,
  championship: Championship
): Promise<ListChampionshipDaysOutput> {
  if (!CHAMPIONSHIP_RULES[championship]) throw new UnknownChampionshipError();

  const days = await repo.listFor(db, seasonCode, championship);
  const group = new Set(weeklyExclusionGroup(championship));

  const concurrent = await repo.concurrentDays(
    db,
    seasonCode,
    days.map((day) => day.weekStart)
  );

  const byWeek = new Map<string, Set<Championship>>();
  for (const day of concurrent) {
    if (day.championship === championship) continue;
    if (!group.has(day.championship)) continue;
    const set = byWeek.get(day.weekStart) ?? new Set<Championship>();
    set.add(day.championship);
    byWeek.set(day.weekStart, set);
  }

  return {
    seasonCode,
    championship,
    days: days.map((day) => ({
      id: day.id,
      number: day.number,
      weekStart: day.weekStart,
      weekEnd: day.weekEnd,
      matchDate: day.matchDate,
      kind: day.kind,
      label: day.label,
      referenceEloDate: day.referenceEloDate,
      concurrentChampionships: [...(byWeek.get(day.weekStart) ?? [])]
    }))
  };
}
