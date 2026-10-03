---
paths:
  - "tsconfig*.json"
  - "apps/*/tsconfig.json"
  - "**/vitest.config.ts"
  - "vitest.aliases.ts"
  - "apps/*/astro.config.mjs"
  - ".storybook/**"
  - "libs/shared/ui/**"
  - "**/project.json"
  - "nx.json"
---

# Alias `@nba/*`, builds et cache Nx

Il n'y a pas de workspaces npm : `libs/*` ne se résout que par alias, et chaque outil a sa table (`CONTRIBUTING.md` §6 bis). `npm run check:aliases` contrôle ce qu'il peut, avec des angles morts.

## Où déclarer un alias

- `tsconfig.base.json` (typecheck) et `vitest.aliases.ts` (racine + architecture).
- Chaque app Astro tient **ses propres** `paths` (`apps/<app>/tsconfig.json`) : un alias manquant casse `astro check` ou le build SSR (`Rolldown failed to resolve import`), `tsc` restant vert.
- Chaque `vitest.config.ts` d'app ou de lib a son `resolve.alias` et n'hérite pas de la racine. Angle mort de `check-aliases` : un alias importé par le **module testé** (et non par le `.test.ts`) n'est pas vu ; devant `Failed to resolve import "@nba/…"` en test, aller droit au `vitest.config.ts` de l'app.
- Un package `-ui` consommé par une app va aussi dans `optimizeDeps.exclude` de son `astro.config.mjs`.
- Un pattern de `@nba/ui` est tiré par admin **et** storefront : un nouvel import `@nba/*` dans `libs/shared/ui` se déclare dans les deux apps. `.storybook/main.ts` dérive seul ses alias de `tsconfig.base.json`.
- `astro:transitions/client` (importé par `libs/shared/ui/src/lib/navigation.ts`) n'existe que dans un build Astro : stub `libs/shared/ui/src/mocks/astro-transitions.ts` aliasé dans 5 configs (vitest racine, admin, storefront, ui, storybook).

## Builds

- Le cache Nx ne voit pas les `.svelte` des libs comme inputs des apps : après avoir touché une lib, `npx nx build admin --skip-nx-cache`, sinon une erreur de gabarit est masquée par le cache.
- Les builds inlinent l'environnement (`PUBLIC_APP_ENV`, VAPID, URLs, `VITE_APP_VERSION`) : toute variable lue au build est déclarée en `inputs` `{ "env": … }` de la cible `build`, sinon un cache staging peut être resservi en production.
- `@lucide/svelte` n'exporte plus les logos de marques : seul le build le voit (« Missing export »).
- Une dépendance découverte tard par Vite fait tomber `astro dev` (chunk périmé côté workerd) : la pré-déclarer dans `vite.optimizeDeps.include`, la liste se lit dans `apps/<app>/.astro/dev.log` (`dependency optimized:`).
