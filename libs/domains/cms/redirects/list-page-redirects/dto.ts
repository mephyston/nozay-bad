import type { CmsRedirectRow } from '../../shared/schema';

export interface ListPageRedirectsInput {
  /** Chemin de destination : on cherche ce qui redirige **vers** cette page. */
  toPath: string;
}

export type ListPageRedirectsOutput = CmsRedirectRow[];
