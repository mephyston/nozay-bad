import type { CmsNavItemRow } from '../../shared/schema';
import type { NavLocation } from '../../shared/nav';

export interface SaveNavItemInput {
  /** Absent : création. Présent : modification de l'entrée existante. */
  navItemId?: number;
  location: NavLocation;
  label: string;
  pageId?: number | null;
  externalUrl?: string | null;
  parentId?: number | null;
  position?: number;
}

export type SaveNavItemOutput = CmsNavItemRow;
