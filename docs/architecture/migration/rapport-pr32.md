# Rapport PR32 — Finir de vider data-access/ et ui/

## Description du Changement
Cette PR finalise la migration de la structure vers l'architecture par Tranches Verticales (VSA) pour les 4 domaines (`accounting`, `expenses`, `members`, `shop`).

1. **Migration des Schémas Drizzle** :
   - Déplacement du schéma Drizzle physique (`data-access/src/schema.ts`) vers `shared/schema.ts` dans chacun des 4 domaines.
   - Les schémas de base de données sont désormais internes à chaque domaine et ne sont plus importés en dehors de ceux-ci.
   - Alignement du schéma minimal redondant `membersTable` dans le domaine `accounting` avec les spécifications canoniques exactes de la table physique (incluant toutes les colonnes requises par les tests d'intégration, résolvant l'erreur `table members has no column named created_at`).

2. **Éradication de `data-access/` et `ui/` à la racine des domaines** :
   - Suppression complète de tous les dossiers `data-access/` physiques de chaque domaine.
   - Déplacement des ré-exports de composants UI depuis `ui/src/index.ts` vers un fichier `ui.ts` à la racine de chaque domaine (`libs/domains/<domaine>/ui.ts`).
   - Suppression complète des répertoires `ui/` de chaque domaine.
   - Nettoyage des alias TSConfig et des configurations de test Vitest correspondantes.

3. **Mise à jour des alias TypeScript** :
   - Suppression des alias `@metacult/features-*-data-access` dans `tsconfig.base.json` et dans les configurations de test.
   - Redirection de `@metacult/features-*-ui` vers `libs/domains/<domaine>/ui.ts`.
   - Redirection de `@metacult/features-*-api` vers `libs/domains/<domaine>/index.ts`.

4. **Séparation propre de l'exécution des tests API et UI** :
   - Déplacement des configurations de tests d'intégration Svelte/UI vers `libs/domains/<domaine>/vitest.config.ui.ts` à la racine de chaque domaine (utilisant l'environnement `jsdom` et le plugin Svelte).
   - Maintien des tests API isolés avec l'environnement `miniflare` dans `libs/domains/<domaine>/api/vitest.config.ts`.
   - Les tests d'UI et d'API sont tous découverts par le projet racine via `vitest.config.ts`.

## Preuve d'Exécution des Tests (`npx vitest run`)
Tous les tests du monorepo (283 tests répartis dans 79 suites) s'exécutent avec succès :

```
Test Files  79 passed (79)
     Tests  283 passed (283)
  Start at  23:58:10
  Duration  38.60s (transform 266.71s, setup 0ms, import 345.66s, tests 3.43s, environment 9.64s)
```

## Périmètre Traité et Restant
- **Traité** : Migration complète des schémas Drizzle, éradication de `data-access/` et de `ui/` à la racine des 4 domaines, nettoyage des alias TSConfig et Vitest, correction des mocks Vitest pour le module members-api.
- **Restant** : Aucun. Cette PR marque la fin des migrations structurelles initialement prévues pour le nettoyage et l'architecture VSA.
