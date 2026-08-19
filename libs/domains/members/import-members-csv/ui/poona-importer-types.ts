export interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: number;
}

export const REQUIRED_HEADERS = ['Licence', 'Saison', 'Nom', 'Prénom', 'Sexe', 'Date naissance', 'Type'];
