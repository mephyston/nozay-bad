export interface GenerateIndivSessionsInput {
  /** Bornes comprises, dates locales « AAAA-MM-JJ ». */
  from: string;
  to: string;
  /** Absent = tous les créneaux d'indiv actifs de la grille. */
  slotIds?: number[];
  /** Absent = l'heure de début du créneau. Le mardi, l'indiv ouvre à 19 h 30 avec lui. */
  startTime?: string;
  slotCount?: number;
  slotMinutes?: number;
  capacityPerSlot?: number;
}

export interface GenerateIndivSessionsOutput {
  created: number;
  /** Soirées qui existaient déjà : rejouer une période ne crée rien et n'écrase rien. */
  skipped: number;
}
