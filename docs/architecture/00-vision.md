# Vision

## Contexte

`nba-api` (monorepo Nx) sert 3 applications déployées sur Cloudflare Workers :

- `apps/api` — Worker HTTP (Hono), point d'entrée métier unique
- `apps/admin` — back-office (Astro/Svelte), consomme l'API
- `apps/storefront` — storefront publique (Astro), consomme l'API

Le projet est un **Modular Monolith** : un seul dépôt, un déploiement par app,
mais une frontière logique stricte entre domaines métier.

## Domaines identifiés

- `accounting` (saisons, transactions, factures, chèques, rapprochement bancaire)
- `expenses`
- `members`
- `shop`

Il n'y a pas de domaine `auth` séparé : l'authentification du back-office est
déléguée à Cloudflare Access (vérification JWT dans
`apps/admin/src/middleware.ts`), pas gérée en interne.

## Principe directeur

- Les **apps** (`api`, `admin`, `storefront`) sont des points d'entrée et
  de composition. Elles ne contiennent aucune règle métier.
- Toute la logique métier vit dans `libs/domains/<domaine>`.
- Chaque domaine est organisé en **Vertical Slice** : un dossier par cas
  d'usage, pas par couche technique.
- Chaque domaine expose une **API publique** (son `index.ts`) ; aucun autre
  domaine n'accède à ses tables ou à son schéma directement.
- Le déploiement reste inchangé pendant toute la migration : **un seul Worker
  par app**, aucun découpage en microservices. Les échanges entre domaines
  restent des appels de fonction in-process, jamais des appels réseau.

## Pourquoi ce changement

Constat de l'audit initial : les domaines sont bien séparés en surface
(`libs/features/<domaine>/{api,data-access,ui}`), mais cette séparation est une
séparation par **couche technique à l'intérieur du domaine**, pas par cas
d'usage. Conséquences observées concrètement dans le code actuel :

- `libs/shared/db/src/helpers.ts` redéfinit une copie de la table `seasons`
  (déjà définie dans `members/data-access` et référencée dans
  `accounting/data-access`) uniquement pour contourner une contrainte Nx —
  risque de dérive de schéma.
- `libs/features/accounting/api/src/helpers.ts` modifie directement
  `membersTable` (montants, statut payé) depuis le domaine `accounting` —
  aucune API publique du domaine `members` n'est utilisée.
- Les `data-access/index.ts` exportent les tables Drizzle brutes
  (`export * from './schema'`) : aucune encapsulation réelle malgré le
  barrel file.
- `libs/features/accounting/api/src/routes/invoices.ts` mélange validation,
  règles métier et requêtes SQL dans un seul handler HTTP par endpoint.

Cette migration vise à corriger ces points et à empêcher leur réapparition,
via des règles explicites (ce document et les suivants) et des garde-fous
automatiques (ESLint, Nx boundaries).
