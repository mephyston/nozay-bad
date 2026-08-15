export interface NotifyPostOutput {
  id: number;
  /** Nombre d'appareils mis en file. 0 = personne d'abonné, ce qui n'est pas une erreur. */
  queued: number;
  notifiedAt: Date;
}
