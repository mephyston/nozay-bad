import type { CmsMediaRow } from '../../shared/schema';

export interface UpdateMediaInput {
  mediaId: number;
  /** Texte alternatif. Vide = média décoratif, ce qui doit rester un choix explicite. */
  alt: string;
}

export type UpdateMediaOutput = CmsMediaRow;
