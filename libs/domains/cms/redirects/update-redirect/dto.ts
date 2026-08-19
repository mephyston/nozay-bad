import type { CmsRedirectRow } from '../../shared/schema';

export interface UpdateRedirectInput {
  redirectId: number;
  /** Nulle = la page a été supprimée : l'adresse répondra 410 Gone. */
  toPath: string | null;
  /** `undefined` = inchangée ; `null` = effacée. */
  note?: string | null;
}

export type UpdateRedirectOutput = CmsRedirectRow;
