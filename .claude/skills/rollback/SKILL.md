---
name: rollback
description: Revenir en arrière en production (workflow « Rollback production »). Uniquement sur demande explicite de l'utilisateur, pendant un incident.
argument-hint: "<motif>"
disable-model-invocation: true
---

# Retour arrière en production

`wrangler rollback` ramène le **code** des Workers, jamais la base. Référence : `CONTRIBUTING.md` §8.5-8.6.

## 1. Évaluer avant d'agir

1. `node scripts/rollback-horizon.mjs` : jusqu'où le retour est sûr. Au-delà de la dernière migration destructive, **ne pas rollbacker** : corriger en avant (une migration, une version de plus) est plus rapide et plus sûr.
2. Cloudflare refuse le rollback si un binding a changé entre les deux versions ; dans ce cas, relancer `/promote` sur le tag précédent.
3. Préférer `worker=tous` : les Workers sont couplés par service bindings, une flotte mélangée partage mal `@nba/db`.

Présenter l'évaluation et **attendre la confirmation**.

## 2. Lancer

```bash
gh workflow run rollback.yml -f worker=tous -f reason="$ARGUMENTS"
# un seul Worker : -f worker=nba-api|nba-admin|nba-storefront|nba-website [-f version_id=<id>]
```

## 3. Dernier recours : la base

D1 Time Travel (30 jours) ramène **toute** la base à un instant et perd les écritures des adhérents depuis. Jamais sans décision explicite de l'utilisateur :

```bash
npx wrangler d1 time-travel info nba-db
npx wrangler d1 time-travel restore nba-db --timestamp=<ISO8601>
```
