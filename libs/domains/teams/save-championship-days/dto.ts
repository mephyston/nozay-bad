import type { Championship } from '../shared/championship';

export interface ChampionshipDayInput {
  number: number;
  /**
   * N'importe quelle date de la semaine de la journée. Elle est ramenée au **lundi** à
   * l'enregistrement : c'est ce lundi qui sert de clé de jointure entre championnats.
   */
  weekStart: string;
  /** Force la date de classement sur cette journée. Rare, réservé aux litiges. */
  referenceEloDate?: string | null;
  /**
   * Jour de jeu, quand le comité le fixe (les vétérans jouent le dimanche).
   * `null` pour le mixte et le masculin : pas de jour commun au championnat, la date se
   * porte rencontre par rencontre.
   */
  matchDate?: string | null;
  /** `playoff` : barrages et finales, que toutes les équipes ne disputent pas. */
  kind?: 'regular' | 'playoff';
  /** Nom d'affichage quand « J15 » ne dit rien : « Barrages aller ». */
  label?: string | null;
}

export interface SaveChampionshipDaysInput {
  seasonCode: string;
  championship: Championship;
  /** Calendrier complet du championnat : la liste remplace l'existante. */
  days: ChampionshipDayInput[];
}

export interface SaveChampionshipDaysOutput {
  seasonCode: string;
  championship: Championship;
  count: number;
}
