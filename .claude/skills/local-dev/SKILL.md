---
name: local-dev
description: Démarrer, diagnostiquer ou réparer l'environnement de développement local (API wrangler, admin, storefront, site Astro, D1 locale). À utiliser pour lancer les apps, et devant un 500 ou 503 en local, une page qui ne reflète pas une modification, un astro dev qui refuse de démarrer, ou des écrans vides.
---

# Environnement local

| App | Commande | Port |
|---|---|---|
| API (`nba-api`) | `npm run dev:api` — **en premier** | 8787 |
| admin | `npm run dev:admin` | 4321 |
| storefront | `npm run dev:storefront` | 4322 |
| site public | `npm run dev:website` | 4323 |

Journal d'une app : `npm run logs:<app>`.

## Avant de lancer quoi que ce soit

Astro 7 gère un **démon** de dev persistant :

```bash
(cd apps/<app> && npx astro dev status)
```

S'il tourne déjà, `astro dev` rend la main aussitôt (exit 0) sans rien démarrer. Le démon écoute en **IPv6** : utiliser `localhost` ou `[::1]`, pas `127.0.0.1`. Ne jamais tuer un `astro dev`/`workerd` sans regarder son âge (`ps -o etime`) : il peut appartenir à une autre session.

## Pannes connues, par symptôme

| Symptôme | Cause | Remède |
|---|---|---|
| 500 opaque juste après une migration, tests verts | migration non appliquée en local | skill `/new-migration` §4 |
| 503 « Worker nba-api not found » | binding de service mort entre deux processus | `API_URL=http://127.0.0.1:8787` dans le `.dev.vars` de l'app, puis redémarrer l'app |
| écrans de compta vides, connecté en super admin | base locale réinitialisée (le seed ne recharge aucun mouvement) | interroger l'API : `200` + `data: []` = base vide, `403` = droits |
| modification invisible sur le site | cache de page **et** de données, aussi en dev | `curl -sD - -o /dev/null http://localhost:4323/ \| grep cf-cache-status` ; incrémenter `cms_content_version` dans la D1 locale, attendre ~10 s |
| HTML à jour mais styles d'un `.astro` périmés | CSS scopé gardé par le démon | `astro dev stop && astro dev start`, puis incrémenter la version |
| « Dev server process exited before becoming ready » | dépendance découverte tard par Vite | lire `apps/<app>/.astro/dev.log`, ajouter les `dependency optimized:` à `vite.optimizeDeps.include` |

## Repères

- D1 locale : `apps/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`, partagée par l'API et le site (`persistState`). Toujours `--config wrangler.json` depuis `apps/api` (`wrangler.dev.json` pointe une base vide).
- Identité en dev : cookie d'usurpation, sinon `DEV_EMAIL`, sinon `admin@nozaybad.fr`.
- Appel direct de l'API : `curl -H "x-api-key: $(grep ^INTERNAL_API_KEY= apps/api/.dev.vars | cut -d= -f2-)" -H "x-caller: admin" -H "x-user-email: admin@nozaybad.fr" http://127.0.0.1:8787/iam/me`.
- Avant toute manipulation de la base locale : `sqlite3 <fichier> ".backup .data/backups/local-d1-<date>.sqlite"`.
- Dans un worktree, la D1 locale est **vide** (l'état `.wrangler` n'est pas recopié) : appliquer les migrations, ou copier l'état depuis l'arbre principal si on a besoin de données.
