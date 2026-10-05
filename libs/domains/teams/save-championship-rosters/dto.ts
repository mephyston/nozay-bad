import type { Championship } from '../shared/championship';

export interface SaveChampionshipRostersInput {
  seasonCode: string;
  championship: Championship;
  /** L'effectif complet de **chaque** équipe active du championnat. */
  rosters: Array<{ teamId: number; licences: string[] }>;
}

export interface SaveChampionshipRostersOutput {
  teams: number;
  count: number;
  /** Licences écartées parce qu'absentes du référentiel des adhérents. */
  rejected: string[];
  /** Licences écartées parce que le championnat n'admet pas leur catégorie d'âge. */
  outOfCategory: string[];
}
