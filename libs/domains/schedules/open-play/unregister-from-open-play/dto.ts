export interface UnregisterFromOpenPlayInput {
  sessionId: number;
  /** Imposé par l'appelant de confiance, comme à l'inscription. */
  memberId: number;
}

export interface UnregisterFromOpenPlayOutput {
  /** Faux quand il n'y avait rien à retirer — ce n'est pas une erreur. */
  removed: boolean;
}
