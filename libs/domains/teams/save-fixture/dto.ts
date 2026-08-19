export interface SaveFixtureInput {
  teamId: number;
  /** Journée du championnat de l'équipe. */
  dayId: number;
  /** 1 partout, 2 en régional qui dispute deux rencontres par journée (art. 1.6.3). */
  slot?: number;
  status?: 'scheduled' | 'bye' | 'forfeit';
  /** Date et heure réelles du match, dans la semaine de la journée. */
  playedAt?: string | null;
  home?: boolean;
  opponent?: string | null;
  venue?: string | null;
}

export interface SaveFixtureOutput {
  id: number;
  teamId: number;
  dayId: number;
  slot: number;
  /**
   * La date réelle sort de la semaine théorique de la journée.
   *
   * Autorisé et signalé, jamais refusé : un gymnase indisponible ou des intempéries
   * déplacent la rencontre (art. 4.2.3). La journée, elle, ne bouge pas — c'est elle qui
   * porte les règles.
   */
  outsideTheoreticalWeek: boolean;
}
