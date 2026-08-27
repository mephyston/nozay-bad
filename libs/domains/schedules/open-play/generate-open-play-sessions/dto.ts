export interface GenerateOpenPlaySessionsInput {
  /** Bornes comprises, dates locales « AAAA-MM-JJ ». */
  from: string;
  to: string;
  /** Absent = tous les créneaux de jeu libre actifs de la saison. */
  slotIds?: number[];
  /** Seuil appliqué aux séances créées. Absent = le seuil habituel du club. */
  minPlayers?: number;
}

export interface GenerateOpenPlaySessionsOutput {
  created: number;
  /** Séances qui existaient déjà : rejouer une période ne crée rien et n'écrase rien. */
  skipped: number;
}
