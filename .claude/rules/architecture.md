# Architecture : monolithe modulaire, tranches verticales

Toujours chargée. Le détail fait foi dans `CONTRIBUTING.md` §1-5 et `docs/architecture/` (ADR, `08-rules.md`) : cette règle n'en garde que ce qu'on oublie.

## Organisation

- `apps/` = les 6 Workers déployables (`api`, `admin`, `storefront`, `website`, `caisse`, `buvette`) ; `libs/domains/<domaine>/` = le métier ; `libs/shared/` = **technique uniquement** (aucune règle métier, aucune table, aucun catalogue de valeurs).
- Le code se regroupe par **cohérence fonctionnelle**, jamais par couche technique : un gros domaine se découpe en capacités métier (`accounting/ledger/`, `accounting/invoices/`), pas en `commands/`/`queries/` (ADR-0003).
- Un cas d'usage = un dossier (une tranche) : `dto.ts`, `validator.ts` (TypeBox), `handler.ts` (ni Hono ni Drizzle), `repository.ts` (seul à importer `drizzle-orm`), `route.ts` (valide, appelle le handler, répond), `handler.test.ts`, et `ui/` pour ses composants.
- Les tables Drizzle d'un domaine vivent dans `libs/domains/<domaine>/shared/schema.ts`, **à la racine du domaine** : le glob de `drizzle.config.ts` ne descend que d'un niveau.
- 200 lignes maximum par fichier dans un domaine (contrôlé en CI).

## Frontières

- Un domaine n'expose que son `index.ts`. Jamais d'import d'une table ou d'un fichier interne d'un autre domaine.
- Deux tranches d'un même domaine ne s'importent pas entre elles.
- Les frontières sont tenues par `@nx/enforce-module-boundaries` (tags `scope:*`/`type:*` dans `eslint.config.js`). `scope:cms` et `scope:schedules` sont des **feuilles** à dessein : quand deux domaines doivent se composer, c'est `apps/api` qui compose (ex. `apps/api/src/content-version.ts`), jamais un import croisé. Seul le lint voit la faute, les tests passent.
- Toute écriture multi-tables est atomique (`db.batch()` / `db.transaction()`, cf. ADR-0002 et ADR-0005).
- Injection par fabrique : les routes reçoivent leurs dépendances (`create<Slice>Route(...)`), pas d'import de singleton.

## Graphe Nx

- Nx ne voit **pas** les imports écrits dans les `.astro` et `.svelte`. Ils sont déclarés en `implicitDependencies` dans les `project.json`, et `npm run check:nx-deps` casse la CI sur tout écart : un nouvel import `@nba/*` depuis un `.astro`/`.svelte` oblige à mettre la liste à jour.
- Les `project.json` acceptent les commentaires `//`.

## Rien qui nomme le club

Nom, adresse, IBAN, documents, fonctionnalités : `club_settings` / `club_features` (domaine `club`), lus par `getClubSettings(db)`, `locals.club` ou `@nba/club-ui`. `libs/club-identity.test.ts` refuse toute source qui nomme le club (exceptions : migrations, `scripts/build-env.mjs`, tests).
