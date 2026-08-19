import type { CmsRedirectRow } from '../../shared/schema';

export interface CreateRedirectInput {
  fromPath: string;
  /** Nulle = la page a été supprimée : l'adresse répondra 410 Gone. */
  toPath: string | null;
  note?: string | null;
}

export type CreateRedirectOutput = CmsRedirectRow;
