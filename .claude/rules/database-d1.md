---
paths:
  - "libs/shared/db/**"
  - "libs/domains/**/schema.ts"
  - "libs/domains/**/repository.ts"
  - "libs/domains/**/repository.test.ts"
  - "apps/api/wrangler.json"
---

# D1, Drizzle et migrations

Procédure complète d'ajout : skill `/new-migration`. Ici, ce qu'il faut savoir en écrivant du code qui touche la base.

## Migrations

- Append-only : `libs/shared/db/migrations/migrations.lock.json` hache chaque fichier, `npm run check:migrations` refuse toute retouche. `--update` n'enregistre que les **ajouts** : pour corriger une migration non poussée, `git checkout -- migrations.lock.json` puis `--update` à nouveau.
- Une migration est appliquée par les tests (`setupMockDb` rejoue tout) et par la CI au déploiement, **jamais par `wrangler dev`** : à appliquer à la main en local (`npx wrangler d1 migrations apply nba-db --local --config wrangler.json` depuis `apps/api`). L'oubli donne des 500 opaques en local, tests au vert.
- `check:schema` exige que l'instantané drizzle suive (`drizzle-kit generate` sans diff). Toute suppression de contrainte (FK, UNIQUE, CHECK) exige `[allow-constraint-loss]` dans le message de commit.
- Une nouvelle table s'ajoute à la liste de drop de `libs/shared/db/src/test-utils.ts` (enfants avant parents), sinon des lignes fuient entre tests.
- `test-utils.ts` découpe les `.sql` sur `--> statement-breakpoint` ou sur les `;` **sans ôter les commentaires** : un `;` dans un commentaire, ou le marqueur cité dans un commentaire, produit un fragment vide et fait tomber **tous** les tests D1 d'un coup.
- Destructive = non rollbackable. Appliquer l'*expand/contract* (ajouter, basculer le code, supprimer dans une version ultérieure) ; `node scripts/rollback-horizon.mjs` donne la distance de retour sûre. Le faire sur une branche (cf. `git-workflow.md`).

## Requêtes

- SQL paramétré uniquement (Drizzle ou `sql\`\`` tagué) ; jamais de concaténation.
- **100 variables liées maximum par requête.** `insert().values(xs.map(...))` casse dès que `xs` croît avec le catalogue (`D1_ERROR: too many SQL variables`, 500 opaque en prod). Si la cardinalité n'est pas bornée par le domaine, découper en lots et passer par `db.batch()`.
- Dans un `db.batch()`, `last_insert_rowid()` désigne la dernière ligne insérée **toutes tables confondues** : valable pour `[INSERT parent, UPDATE …]`, faux dès qu'il y a plusieurs enfants. Référencer le parent par sa clé naturelle (`SELECT id FROM invoices WHERE invoice_number = …`).
- `UNION ALL` de plus de quelques termes refusé par D1 (« too many terms in compound SELECT ») : préférer des sous-requêtes scalaires.
- Le worker API n'a **pas** `nodejs_compat` : pas de `Buffer`, binaires stockés en base64 TEXT, 100 Ko max par instruction SQL.

## Bases

| Environnement | Base | Commande |
|---|---|---|
| local | `nba-db` (`apps/api/.wrangler/state/v3/d1`) | `--local --config wrangler.json` depuis `apps/api` |
| staging | `nba-db-staging` | `--remote --env staging` |
| production | `nba-db` | `--remote` — **jamais sans accord explicite** |

`wrangler.dev.json` pointe une base vide (`MOCK_DB_ID_FOR_LOCAL`) : vérifier l'identifiant affiché avant tout `apply`.
