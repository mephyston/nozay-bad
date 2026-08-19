export interface RemindLineupsInput {
  seasonCode: string;
  /**
   * Instant courant en **heure de Paris**, `YYYY-MM-DDTHH:mm`. Les dates du domaine
   * (`played_at`, `week_start`) sont des heures locales naïves : la comparaison se fait
   * en texte, jamais via `Date` — le cron, lui, tourne en UTC.
   */
  parisNow: string;
}

export interface RemindLineupsOutput {
  /** Rappels réellement mis en file (la dédup quotidienne peut en absorber). */
  reminded: Array<{ teamId: number; dayNumber: number }>;
}
