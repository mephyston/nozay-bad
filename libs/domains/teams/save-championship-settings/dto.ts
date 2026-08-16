import type { Championship } from '../shared/championship';

export interface SaveChampionshipSettingsInput {
  seasonCode: string;
  championship: Championship;
  /** `null` dépingle la date : plus aucune valeur d'équipe n'est alors calculable. */
  referenceEloDate?: string | null;
  /** Lien vers le règlement. `null` le retire de la fiche d'équipe. */
  rulesUrl?: string | null;
  rulesLabel?: string | null;
}

export interface SaveChampionshipSettingsOutput {
  championship: Championship;
  referenceEloDate: string | null;
  rulesUrl: string | null;
  rulesLabel: string | null;
}
