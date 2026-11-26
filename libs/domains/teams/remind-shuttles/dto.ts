export interface RemindShuttlesInput {
  seasonCode: string;
  /** Jour civil du club, AAAA-MM-JJ. */
  today: string;
}

export interface RemindShuttlesOutput {
  /** Rappels réellement mis en file (la dédup quotidienne peut en absorber). */
  reminded: Array<{ teamId: number; dayNumber: number }>;
}
