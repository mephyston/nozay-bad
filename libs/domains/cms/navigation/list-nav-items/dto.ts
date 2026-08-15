import type { CmsNavItemRow } from '../../shared/schema';
import type { NavLocation } from '../../shared/nav';

export interface ListNavItemsInput {
  location?: NavLocation;
}

/** Entrée de menu, avec le chemin de la page liée déjà résolu. */
export interface NavItemView extends CmsNavItemRow {
  /**
   * Adresse effective : chemin de la page liée, ou URL externe.
   *
   * **Nulle pour un conteneur** — une entrée de premier niveau qui ne fait que
   * regrouper ses sous-entrées, sans page à elle. C'est au rendu de décider ce qu'il
   * en fait ; un repli sur `'#'` lui retirerait justement le moyen de le savoir.
   */
  href: string | null;
  children: NavItemView[];
}

export type ListNavItemsOutput = NavItemView[];
