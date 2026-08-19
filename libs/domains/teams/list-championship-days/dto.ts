import type { Championship } from '../shared/championship';

export interface ChampionshipDayItem {
  id: number;
  number: number;
  /** Lundi de la semaine. Clé de comparaison entre championnats. */
  weekStart: string;
  weekEnd: string;
  /** Jour commun au championnat, ou `null` quand la date se porte rencontre par rencontre. */
  matchDate: string | null;
  kind: 'regular' | 'playoff';
  /** « Barrages aller », ou `null` pour une journée régulière affichée « Jxx ». */
  label: string | null;
  referenceEloDate: string | null;
  /** Journées d'autres championnats tombant la même semaine. */
  concurrentChampionships: Championship[];
}

export interface ListChampionshipDaysOutput {
  seasonCode: string;
  championship: Championship;
  days: ChampionshipDayItem[];
}
