import type { Championship } from '../shared/championship';

/** Une journée dont le classement de référence est publié aujourd'hui. */
export interface RankingReminderDay {
  championship: Championship;
  championshipLabel: string;
  dayId: number;
  dayNumber: number;
  /** Nom d'affichage (« Barrages aller »), `null` pour une journée régulière. */
  dayLabel: string | null;
  weekStart: string;
}
