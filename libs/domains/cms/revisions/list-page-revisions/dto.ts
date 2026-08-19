export interface ListPageRevisionsInput { pageId: number }

export interface PageRevisionSummary {
  id: number;
  revision: number;
  authorEmail: string;
  reason: string | null;
  createdAt: Date | number;
  /** Nombre de blocs de l'instantané, pour situer l'ampleur du changement. */
  blockCount: number;
}

export type ListPageRevisionsOutput = PageRevisionSummary[];
