export interface SaveFixtureDateInput {
  teamId: number;
  dayNumber: number;
  slot?: number;
  /**
   * Licence de l'adhérent qui enregistre, imposée depuis la session par l'espace
   * adhérent. Seuls le capitaine et le vice-capitaine peuvent fixer la date.
   */
  licence: string;
  /** `YYYY-MM-DDTHH:mm`, ou `null` pour l'effacer. */
  playedAt: string | null;
  venue?: string | null;
  /**
   * Confirme une date hors de la semaine théorique.
   *
   * Sans cet aveu explicite, une date hors semaine est refusée : c'est presque toujours
   * une faute de frappe. Avec, elle passe — un gymnase indisponible, cela arrive.
   */
  confirmOutsideWeek?: boolean;
}

export interface SaveFixtureDateOutput {
  teamId: number;
  dayNumber: number;
  playedAt: string | null;
  venue: string | null;
  /** La date retenue sort de la semaine théorique de la journée. */
  outsideTheoreticalWeek: boolean;
  /**
   * Le jour choisi est-il celui où ce championnat se joue ?
   *
   * `derogation` ou `unusual` ne refusent jamais : le mixte se joue en semaine, les
   * vétérans le dimanche, mais les comités accordent des exceptions. L'écran le signale.
   */
  matchDay: 'allowed' | 'derogation' | 'unusual';
}
