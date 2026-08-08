/**
 * Stub de `astro:transitions/client` pour Vitest.
 *
 * Ce module virtuel n'existe qu'à l'intérieur d'un build Astro. `@nba/ui` l'importe
 * (cf. `lib/flash.ts`) et est consommé par les deux applications **et** par les tests
 * de composants, qui tournent hors Astro : sans alias, tout test important `@nba/ui`
 * échouerait à la résolution.
 *
 * L'alias doit être déclaré dans CHAQUE config Vitest ayant son propre `resolve.alias`
 * (les configs de projet ne l'héritent pas de la racine) : racine, apps/admin,
 * apps/storefront, libs/shared/ui.
 */
export function navigate(_href: string, _options?: { history?: 'auto' | 'push' | 'replace' }): Promise<void> {
  return Promise.resolve();
}
