import type { CmsNavItemRow } from '../../shared/schema';

export interface SaveNavItemInput {
  /** Absent : création. Présent : modification de l'entrée existante. */
  navItemId?: number;
  location: 'header' | 'footer';
  label: string;
  pageId?: number | null;
  externalUrl?: string | null;
  parentId?: number | null;
  position?: number;
}

export type SaveNavItemOutput = CmsNavItemRow;
