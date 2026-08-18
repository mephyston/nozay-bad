import type { ClubFunction } from '../shared/club-functions';

export interface SaveClubFunctionsInput {
  licence: string;
  /** Code (`25-26`) ou identifiant de saison. */
  season: string | number;
  /** Fonctions que porte l'adhérent après enregistrement — liste complète, pas un delta. */
  functions: ClubFunction[];
}

export interface SaveClubFunctionsOutput {
  licence: string;
  functions: ClubFunction[];
}
