import type { BlockPayload } from '../../shared/blocks';
import type { CmsPageRow, CmsPostRow } from '../../shared/schema';

export interface ResolveRouteInput {
  /** Chemin déjà normalisé par `normalisePath`. */
  path: string;
  /**
   * Rend les brouillons visibles. Réservé à l'administration : le site public ne le
   * demande jamais, et la route ne le lui accorderait pas.
   */
  includeDrafts?: boolean;
}

export interface ResolvedPageView {
  page: CmsPageRow;
  blocks: BlockPayload[];
}

/**
 * Issue de la résolution d'une URL publique.
 *
 * `gone` est distinct de `notfound` à dessein : une page qui a existé et n'a pas de
 * successeur mérite un 410, qui sort de l'index de Google bien plus vite qu'un 404.
 */
export type ResolveRouteOutput =
  | ({ kind: 'page' } & ResolvedPageView)
  | { kind: 'post'; post: CmsPostRow }
  | { kind: 'redirect'; toPath: string; statusCode: number }
  | { kind: 'gone' }
  | { kind: 'notfound' };
