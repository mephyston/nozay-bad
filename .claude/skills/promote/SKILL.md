---
name: promote
description: Promouvoir une version en production (workflow « Promote to production »). Uniquement sur demande explicite de l'utilisateur.
argument-hint: "<tag vX.Y.Z ou SHA complet>"
disable-model-invocation: true
---

# Promotion en production

On promeut un **commit** (tag ou SHA), reconstruit avec les valeurs de production ; les 4 Workers sont redéployés ensemble. Référence : `CONTRIBUTING.md` §8.

## 1. Préparer, sans rien lancer

1. Ref à promouvoir : `$ARGUMENTS`, sinon le dernier tag (`git fetch --tags && git describe --tags --abbrev=0 origin/main`).
2. Le run `deploy.yml` de ce SHA doit être vert : `gh run list --workflow deploy.yml --commit <sha> --limit 1`.
3. Ce que la production va recevoir : tag actuellement en production (`gh run list --workflow promote.yml --status success --limit 1`), puis `git log --oneline <tag-prod>..<ref>`.
4. **Migrations embarquées** : `git diff --name-only <tag-prod>..<ref> -- libs/shared/db/migrations/*.sql`. Pour chacune, dire si elle est additive ou destructive ; si destructive, le retour arrière ne sera plus possible au-delà de cette version (`node scripts/rollback-horizon.mjs`).
5. Effets de bord à prévoir : nouveaux secrets (`wrangler secret put`), nouvelles `vars`, scripts post-déploiement (ex. `scripts/upload-club-assets.mjs`), changement de crons.

Présenter ce bilan et **attendre la confirmation** de l'utilisateur.

## 2. Lancer

```bash
gh workflow run promote.yml -f ref=<ref>
gh run watch "$(gh run list --workflow promote.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

`skip_migrations=true` uniquement pour reprendre une promotion dont les migrations sont déjà passées.

## 3. Vérifier

- `/` du site 200, page de connexion de l'admin et du storefront 200, `/health` de l'API si exposée.
- Après une migration : la donnée attendue en base (requête de lecture uniquement).
- Le badge de version de l'admin affiche le nouveau tag.
