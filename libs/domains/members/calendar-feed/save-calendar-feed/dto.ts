export interface SaveCalendarFeedInput {
  /** Licence du profil actif, imposée par l'appelant de confiance (session storefront). */
  licence: string;
  /** Empreinte SHA-256 du jeton : le jeton lui-même n'arrive jamais jusqu'ici. */
  tokenHash: string;
}

export interface SaveCalendarFeedOutput {
  createdAt: Date;
}
