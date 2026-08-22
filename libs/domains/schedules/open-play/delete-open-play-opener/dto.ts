export interface DeleteOpenPlayOpenerInput {
  openerId: number;
}

export interface DeleteOpenPlayOpenerOutput {
  /** Faux quand il n'y avait rien à retirer — ce n'est pas une erreur. */
  removed: boolean;
}
