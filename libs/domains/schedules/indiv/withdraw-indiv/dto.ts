export interface WithdrawIndivInput {
  sessionId: number;
  /** Imposé par l'appelant de confiance, comme à la candidature. */
  memberId: number;
}

export interface WithdrawIndivOutput {
  /** Faux quand il n'y avait rien à retirer — ce n'est pas une erreur. */
  removed: boolean;
}
