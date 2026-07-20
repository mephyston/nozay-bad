# Rapport de PR — PR31 — Déplacer la composition racine hors de api/

## Périmètre traité
Ce correctif déplace le point d'entrée de composition d'API (routeurs Hono globaux de chaque domaine) vers la racine de chaque domaine, éliminant ainsi le sous-dossier de composition `api/src/index.ts`.

1. **Création des points d'entrée racines** :
   - `libs/domains/accounting/index.ts`
   - `libs/domains/expenses/index.ts`
   - `libs/domains/members/index.ts`
   - `libs/domains/shop/index.ts`
2. **Suppression des anciens points d'entrée** :
   - `libs/domains/accounting/api/src/index.ts`
   - `libs/domains/accounting/api/src/routes.ts`
   - `libs/domains/expenses/api/src/index.ts`
   - `libs/domains/members/api/src/index.ts`
   - `libs/domains/shop/api/src/index.ts`
3. **Mise à jour des alias TypeScript (`tsconfig.base.json`)** : Les alias `@metacult/features-*-api` pointent désormais directement vers les fichiers `index.ts` à la racine de leur domaine respectif.
4. **Mise à jour des configurations Vitest** :
   - Ajustement des alias de résolution dans les configurations de tests unitaires de domaine (`libs/domains/*/api/vitest.config.ts`) et globaux (`apps/api/vitest.config.ts`) pour correspondre aux nouveaux chemins racines.
5. **Mise à jour des tests d'intégration** : Modification des imports de routeurs dans les fichiers `routes.test.ts` de chaque domaine.

## Hors Scope
- La logique d'exécution ou les endpoints exposés par l'API.

## Preuve de conformité

### Sortie de la suite complète de tests (100% au vert)
```
 RUN  v4.1.10 /Users/david/Lab/nozay-bad

 Test Files  79 passed (79)
      Tests  283 passed (283)
   Start at  00:53:33
   Duration  35.47s (transform 241.80s, setup 0ms, import 314.36s, tests 3.60s, environment 8.29s)
```
*(Tous les 283 tests unitaires et de routes s'exécutent avec succès)*
