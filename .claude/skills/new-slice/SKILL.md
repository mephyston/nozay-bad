---
name: new-slice
description: Créer un nouveau cas d'usage (tranche verticale) dans un domaine de libs/domains — commande ou requête, avec route Hono, validation TypeBox, handler pur, repository Drizzle, tests, branchement dans l'API et l'autorisation, documentation métier.
argument-hint: "<domaine> <nom-du-cas>"
---

# Nouvelle tranche verticale

Règles : `.claude/rules/architecture.md`, `CONTRIBUTING.md` §2-5. Arguments : `$ARGUMENTS` (domaine, nom du cas en kebab-case).

## 1. Partir d'une tranche voisine

Lire une tranche existante du **même domaine** et du même genre (lecture ou écriture) et en reprendre la forme exacte : nommage des fabriques, forme des erreurs, style des tests. Ne pas inventer de variante.

## 2. Fichiers

```
libs/domains/<domaine>/[<capacité>/]<nom-du-cas>/
  dto.ts            types d'entrée et de sortie
  validator.ts      TypeBox + tbValidator ; échec = 400 { success: false, error }
  handler.ts        métier pur : ni hono, ni drizzle-orm
  repository.ts     seul fichier qui importe drizzle-orm ; SQL paramétré
  route.ts          export const create<Cas>Route = (...) => …
  handler.test.ts   colocalisé
  ui/               composants Svelte du cas, s'il y en a
```

- 200 lignes maximum par fichier.
- Pas d'import d'une autre tranche : ce qui est partagé monte dans `shared/` du domaine.
- Écriture multi-tables : un seul `db.batch()`. Écriture de N lignes : vérifier la limite de 100 variables.
- Données visibles sur le site public : l'invalidation passe par `apps/api/src/content-version.ts`.

## 3. Brancher

- Monter la route dans le routeur du domaine, exporter ce qui doit l'être par `libs/domains/<domaine>/index.ts`.
- `apps/api/src/authz/route-permissions.ts` : déclarer la permission exigée (`coverage.test.ts` échoue sinon). Nouvelle permission → `.claude/rules/permissions.md`.
- Nouvelle table ou colonne → skill `/new-migration`.
- Écran d'admin → `.claude/rules/ui-svelte.md`, et `apps/admin/src/lib/page-permissions.ts` pour une nouvelle page.

## 4. Documenter

Règle métier nouvelle ou modifiée → `docs/domain/<domaine>/rules/RF-…` avec scénarios Gherkin, glossaire du `README.md` du domaine (`.claude/rules/domain-docs.md`). `docs/openapi.json` est régénéré par `libs/openapi.test.ts` : le committer.

## 5. Vérifier

```bash
npx vitest run libs/domains/<domaine> apps/api/src/authz libs/openapi.test.ts
npx vitest run --config vitest.architecture.config.ts
npm run typecheck
npx eslint libs/domains/<domaine> --max-warnings 0
```
