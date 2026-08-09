import type { CmsNavItemRow } from '../../shared/schema';

export interface ListNavItemsInput {
  location?: 'header' | 'footer';
}

/** Entrée de menu, avec le chemin de la page liée déjà résolu. */
export interface NavItemView extends CmsNavItemRow {
  /** Adresse effective : chemin de la page liée, ou URL externe. */
  href: string;
  children: NavItemView[];
}

export type ListNavItemsOutput = NavItemView[];
