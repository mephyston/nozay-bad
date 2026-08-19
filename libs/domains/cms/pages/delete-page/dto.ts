export interface DeletePageInput {
  pageId: number;
}

export interface DeletePageOutput {
  deleted: true;
  /** Chemin libéré, à proposer en redirection depuis l'administration. */
  path: string;
}
