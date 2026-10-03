---
name: new-migration
description: Ajouter une migration D1 (nouvelle table, colonne, seed, reprise de données, permission) en tenant l'instantané drizzle, le verrou append-only, le harnais de test et la base locale. À utiliser dès qu'un schema.ts change ou qu'un fichier doit être ajouté sous libs/shared/db/migrations/.
argument-hint: "<nom_en_snake_case>"
---

# Nouvelle migration D1

Contexte : `.claude/rules/database-d1.md`. Les migrations sont **append-only** et **jamais rollbackables** côté base.

## 0. Avant d'écrire

- Destructive (DROP, RENAME, NOT NULL ajouté, contrainte retirée) ? → branche dédiée, motif *expand/contract*, et prévenir l'utilisateur : la version ne sera pas rollbackable (`node scripts/rollback-horizon.mjs`).
- Numéro suivant : `ls libs/shared/db/migrations/*.sql | tail -1`.

## 1. Écrire le SQL à la main

`libs/shared/db/migrations/<NNNN>_$ARGUMENTS.sql`

- Une instruction par bloc, séparées par `--> statement-breakpoint` si le fichier en a plusieurs.
- **Aucun `;` dans un commentaire, aucune citation du marqueur dans un commentaire** : le découpage du harnais de test en ferait un fragment vide et tous les tests D1 tomberaient.
- Reprise de données : à la main (drizzle ne sait que copier colonne à colonne).
- Permission : `INSERT OR IGNORE INTO role_permissions …`, bloc généré depuis `ROLE_PERMISSIONS` (modèle 0017/0032), voir `.claude/rules/permissions.md`.

## 2. Mettre le schéma Drizzle et l'instantané d'accord

1. Modifier `libs/domains/<domaine>/shared/schema.ts`.
2. `npx drizzle-kit generate --config=libs/shared/db/drizzle.config.ts --name $ARGUMENTS`
3. **Supprimer le `.sql` généré**, garder `meta/<NNNN>_snapshot.json` et l'entrée de `meta/_journal.json` (l'index du journal est décalé des numéros de fichier : normal).
4. `npm run check:schema` doit être vert. S'il a été lancé trop tôt, il laisse un instantané orphelin `*_<trois_mots>` : `git checkout -- libs/shared/db/migrations/meta/_journal.json` et supprimer l'orphelin.

## 3. Verrou et harnais

- `node scripts/check-migrations-append-only.js --update` (à refaire après toute retouche : `git checkout -- libs/shared/db/migrations/migrations.lock.json` puis `--update`).
- Nouvelle table → l'ajouter à la liste de drop de `libs/shared/db/src/test-utils.ts`, enfants avant parents.
- Valeur de référence métier → vérifier l'alignement avec `0001_seed_reference_data.sql` (`check:schema`, règle 5).

## 4. Appliquer en local

```bash
cd apps/api
npx wrangler d1 migrations list  nba-db --local --config wrangler.json   # vérifier l'identifiant affiché
npx wrangler d1 migrations apply nba-db --local --config wrangler.json
```

## 5. Vérifier

```bash
npm run check:migrations && npm run check:schema
npx vitest run libs/migrations.test.ts <tests du domaine>
```

Staging et production sont migrés par la CI (`deploy.yml`, `promote.yml`). Ne jamais appliquer à la main en `--remote` sans demande explicite.
