export interface NotifyValueOverflowInput {
  /** L'équipe dont la composition vient d'être validée. */
  teamId: number;
  dayNumber: number;
  slot?: number;
}

export interface NotifyValueOverflowOutput {
  /** La composition validée dépasse la valeur de l'équipe du dessus. */
  upward: boolean;
  /** La composition validée, affaiblie, se fait dépasser par l'équipe du dessous. */
  downward: boolean;
}
