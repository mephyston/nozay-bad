---
name: copy-prod-data
description: Copier les données de production (D1 et médias R2) vers staging ou la base locale, schéma inchangé. Uniquement sur demande explicite de l'utilisateur.
argument-hint: "staging|local"
disable-model-invocation: true
---

# Copie des données de production → $ARGUMENTS

Lecture seule sur la production ; écriture sur la cible, après sauvegarde. Compter ~2 min pour la base.

## 0. Préconditions

- Les trois bases au même niveau : `npx wrangler d1 migrations list <base> …` sur prod, staging et local doivent dire « No migrations to apply ». Sinon, migrer la cible d'abord.
- Travail dans `.data/` (gitignoré).

## 1. Exporter la production

```bash
npx wrangler d1 export nba-db --remote --output .data/prod-full.sql
sqlite3 .data/prod.sqlite "PRAGMA foreign_keys=OFF;" ".read .data/prod-full.sql"
```

Un dump D1 est **alphabétique** : il ne se réimporte pas tel quel (FK). On passe donc par un fichier de données ordonné.

## 2. Construire le fichier de données

Script Python :
- ordre topologique des tables via `PRAGMA foreign_key_list` ; dans une table auto-référencée (`products.parent_id`, `cms_pages.parent_id`, `cms_nav_items.parent_id`), les lignes **sans parent d'abord** (`ORDER BY parent_id IS NOT NULL, rowid`) : une déclinaison de produit peut avoir un id plus petit que son parent, et **D1 contrôle chaque INSERT** sans attendre la fin malgré `defer_foreign_keys` ;
- **100 Ko maximum par instruction** : les justificatifs en base64 (`expenses.photo_url`, `expense_attachments.data_url`) vont jusqu'à 1 Mo. Insérer la colonne vide, puis la remplir par `UPDATE … SET c = c || '<80 Ko>' WHERE id = …` ;
- en tête `PRAGMA defer_foreign_keys=TRUE;`, puis `DELETE FROM` en ordre inverse, `INSERT` à **colonnes explicites** en ordre direct, puis `DELETE`/`INSERT` de `sqlite_sequence` ;
- **exclure** `d1_migrations`, `push_subscriptions`, `push_deliveries` : aucun environnement de test ne doit atteindre un vrai téléphone.

## 3. Répétition à blanc

Rejouer aussi sur une copie de la **cible** (sa sauvegarde chargée dans sqlite) avec `PRAGMA foreign_keys=ON` **sans** transaction : c'est ce que fait D1, et c'est là que sort un mauvais ordre d'insertion.


`cp .data/prod.sqlite .data/dryrun.sqlite`, rejouer le fichier dans `PRAGMA foreign_keys=ON; BEGIN; … COMMIT;`, puis `PRAGMA foreign_key_check` doit être vide.

## 4. Appliquer

```bash
# sauvegarde de la cible d'abord
npx wrangler d1 export <cible> … --output .data/backups/<cible>-$(date +%Y%m%d-%H%M).sql
npx wrangler d1 execute nba-db-staging --remote --env staging --file .data/data.sql --yes    # staging (depuis apps/api)
npx wrangler d1 execute nba-db --local --config wrangler.json --file .data/data.sql --yes   # local (depuis apps/api)
```

Contrôler les comptages par sous-requêtes scalaires (D1 refuse un `UNION ALL` de plus de quelques termes).

## 5. Médias R2

`cms_media`, `cms_media_variants`, `products.image_key` et `persons.photo_key` désignent des objets de `nba-media` (`nba-media-staging` en staging) : les copier en même temps. `persons.photo_key` n'est qu'un **préfixe** : les objets sont `<préfixe>/512` et `<préfixe>/128`, sans extension, type à lire dans le contenu (`file -b --mime-type`). À défaut de jeton R2 pour l'API, `wrangler r2 object get … --remote --file` puis `put` objet par objet marche (~2 s par objet). Wrangler ne sait ni lister ni copier en masse ; passer par l'API Cloudflare (`GET /accounts/{id}/r2/buckets/{b}/objects?per_page=1000`, puis `GET`/`PUT …/objects/{clé encodée}`). En local : `npx wrangler r2 object put nba-media/<clé> --local --file … --content-type …`, **en séquentiel** (en parallèle, ~20 % échouent sur le verrou SQLite de miniflare).

## 6. Après

`DEV_EMAIL` doit désigner un compte qui existe en production. Supprimer `.data/prod*.sql*` (données personnelles).
