---
paths:
  - "apps/**"
  - "libs/shared/runtime-env/**"
  - "libs/shared/api-client/**"
  - "scripts/build-env.mjs"
  - "scripts/patch-wrangler.mjs"
  - ".env.example"
---

# Cloudflare Workers : exécution et configuration

Référence : `CONTRIBUTING.md` §6 et §8.4. Plan Workers **gratuit** : 10 ms de CPU par requête, bundle 3 Mo compressé, 5 crons par compte ; la contrainte réelle est D1, pas le CPU.

## Exécution

- `Astro.locals.runtime.env` **lève** depuis Astro 6, même derrière `?.`. Source de vérité : `import { env } from 'cloudflare:workers'`, via le `resolveEnv()` de chaque app (`src/lib/request-context.ts`).
- Une promesse non attendue est annulée quand le Worker rend sa réponse : `await`, ou `ctx.waitUntil`. Jamais de `void promesse` pour un effet qui compte.
- Erreurs : un `app.onError()` global dans `apps/api/src/index.ts` ; les handlers lèvent, ils ne fabriquent pas de 500 eux-mêmes.
- Validation d'entrée en TypeBox (`tbValidator`) sur body, query et params ; échec = 400.
- Authentification de l'API, dans cet ordre (`apps/api/src/index.ts`) : clé partagée `INTERNAL_API_KEY` exigée sur **toutes** les routes sauf `/health` (comparaison à temps constant, refus si le secret manque, jamais journalisée) → `requireClubFeature()` → `authorize()`, qui résout l'identité affirmée (`x-user-email`, `x-caller`) en permissions. Le navigateur n'atteint jamais l'API : seuls les Workers ont la clé. `caisse` et `buvette` n'atteignent que les routes qui les nomment (`callers`). Ne jamais accepter une décision d'autorisation venue d'un en-tête.
- Cloudflare Access : le domaine d'équipe est `https://nozaybad.cloudflareaccess.com` (secret `CF_TEAM_DOMAIN` de `nba-admin` et `nba-caisse`, vérifié comme `iss` du jeton). Le renommer invalide toutes les sessions ouvertes et casse les PWA restées sur l'ancien domaine : l'admin efface alors le cookie et relance la connexion une fois (`apps/admin/src/lib/access-reauth.ts`).
- Les apps parlent à l'API par le binding de service `API_SERVICE → nba-api`. En dev, ce binding est présent mais mort entre deux processus (503 « Worker not found ») : `API_URL` du `.dev.vars` le supplante, uniquement sous `import.meta.env.DEV`.
- Crons : chez Cloudflare **1 = dimanche** ; écrire les jours en lettres (`MON`). `apps/api/src/scheduled.ts` reconnaît un déclencheur à sa **chaîne exacte**. `env.staging.triggers.crons: []` est obligatoire (sinon staging hérite des crons de prod et dépasse la limite).

## Configuration

- Toute variable ou binding lu dans le code est déclaré dans le `wrangler.json` concerné, **à la racine ET dans `env.staging`** (remplacement, pas fusion), et documenté dans `.env.example`. `check:env` le vérifie, avec deux angles morts : il ne lit pas `r2_buckets`, et ne voit pas une déstructuration `const { X } = env`.
- `PUBLIC_*` = inliné au build, visible du navigateur. Un secret ne porte jamais ce préfixe et se pose par `wrangler secret put` ; en local, dans le `.dev.vars` de l'app (gitignoré).
- Les adresses des applications ne s'écrivent que dans `scripts/build-env.mjs` (table `URLS`) ; un build CI sans elles échoue, le repli `localhost` n'existe qu'en local. Aucune URL en dur ailleurs.
- Les apps Astro déploient `dist/server/wrangler.json` généré par l'adaptateur : `--env staging` n'y fait rien, c'est `scripts/patch-wrangler.mjs` qui applique `env.staging` (`--check` en CI). Seul `apps/api` garde `--env staging` natif.
- Une fonctionnalité **livrée mais inachevée** = drapeau `*_ENABLED` dans `vars`. Ce que le club **choisit** d'utiliser = `club_features`, pas un drapeau.
