export interface UnregisterFromEventInput {
  eventId: number;
  /** Imposé par l'appelant de confiance depuis la session, jamais lu du navigateur. */
  memberId: number;
}

export interface UnregisterFromEventOutput {
  /** Faux si l'adhérent n'était pas inscrit — l'appel reste un succès. */
  removed: boolean;
}
