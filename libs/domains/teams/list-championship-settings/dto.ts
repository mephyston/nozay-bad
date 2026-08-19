import type { Championship, ChampionshipRules } from '../shared/championship';

export interface ChampionshipSettingsItem {
  championship: Championship;
  label: string;
  /** Vient du règlement, pas d'un choix du club : l'écran l'affiche sans le proposer. */
  rankingPolicy: ChampionshipRules['rankingPolicy'];
  /** Date épinglée. Toujours `null` pour un championnat à politique `per_day`. */
  referenceEloDate: string | null;
  /** Lien vers le règlement de la saison, publié aux joueurs sur la fiche d'équipe. */
  rulesUrl: string | null;
  rulesLabel: string | null;
}

export interface ListChampionshipSettingsOutput {
  seasonCode: string;
  items: ChampionshipSettingsItem[];
}
