# ADR-0007 : L'exposition des Workers se déclare dans le dépôt, en Custom Domain

- **Statut** : Accepté — mise en œuvre progressive (`website` d'abord, `admin` et `storefront` ensuite)
- **Date** : 2026-09-17

---

## 1. Contexte

Jusqu'ici, **aucun** `wrangler.json` ne déclarait le moindre `routes`, `route` ou
`custom_domain` : les huit hôtes de la plateforme étaient attachés à la main dans le
tableau de bord Cloudflare. Le dépôt ne connaissait les domaines que comme des
*valeurs* — `SITE_URL`, `PUBLIC_WEBSITE_URL`, les marqueurs de `build-env.mjs` — jamais
comme une topologie. Conséquences : un `wrangler deploy` ne pouvait ni créer ni corriger
un routage, rien ne permettait de vérifier qu'un hôte pointait où il fallait, et un
domaine attaché au mauvais Worker ne se voyait qu'en production.

S'y ajoutait le montage hérité de la bascule du 29/08/2026. `nozaybad.fr` et
`www.nozaybad.fr` étaient des enregistrements **A/AAAA proxifiés vers l'origine
WordPress IONOS**, et deux **Worker Routes** détournaient le trafic avant qu'il ne
l'atteigne. C'était volontaire — supprimer les deux routes rendait WordPress
instantanément, sans redéploiement — et c'était le seul moyen d'attacher l'apex à
l'époque : le flux *Add custom domain* refuse un hostname qui porte déjà un
enregistrement A (« already has externally managed DNS records »). Trois semaines de
production plus tard, ce filet coûte plus qu'il ne protège : la zone décrit une
infrastructure qui n'existe plus.

## 2. Décision

### 2.1 Custom Domain par défaut, jamais de Worker Route

Un hôte de la plateforme s'attache en **Custom Domain** : le Worker *est* l'origine,
Cloudflare gère l'enregistrement et le certificat, et la zone ne contient plus d'IP
tierce. Une Worker Route suppose au contraire une origine derrière — c'est précisément
le montage de transition qu'on quitte. `patch-wrangler.mjs` refuse toute route dont
`custom_domain` n'est pas vrai, et tout motif qui n'est pas un hostname nu (ni chemin,
ni joker).

### 2.2 L'exposition se déclare dans `apps/<app>/wrangler.json`

Comme les bindings : la **racine** décrit la production, le bloc **`env.staging`** la
préproduction. `scripts/patch-wrangler.mjs` réécrit la clé `routes` depuis cette source
dans les deux environnements — l'adaptateur Astro recopie aujourd'hui la racine dans
`dist/server/wrangler.json`, mais rien ne le contractualise, et le jour où il cesserait
de le faire un déploiement retirerait silencieusement ses domaines au Worker.

Le jeu de garde-fous est symétrique de celui des ressources :

| Contrôle | Où |
| --- | --- |
| l'exposition est déclarée des deux côtés, sans domaine qui traverse la frontière | `--check` (CI, `deploy.yml`) |
| une application de `ROUTED_APPS` a bien des routes résolues | `assertResolved()` |
| en préproduction, tout motif commence par `staging-` | `assertResolved()` |
| en production, aucun motif ne contient `staging` | contrôle massue de `assertResolved()` |

`ROUTED_APPS` énumère les applications dont l'exposition est versionnée. Une
application absente reste attachée à la main : le déploiement ne crée rien et ne
vérifie rien, mais il ne détache rien non plus — la clé est simplement supprimée de la
configuration résolue. `website` ouvre la marche ; `admin` et `storefront` rejoignent
la liste une fois un cycle complet observé.

### 2.3 L'API n'a pas de domaine

`nba-api` n'est joignable que par service binding (`API_SERVICE`), `workers_dev` à
`false`. Elle n'entrera jamais dans `ROUTED_APPS` : lui donner un hôte public, ce
serait ouvrir une surface d'attaque et une seconde porte d'entrée à authentifier.

### 2.4 Les hôtes

| Hôte | Worker | Rôle |
| --- | --- | --- |
| `nozaybad.fr` | `nba-website` | site public, **hôte canonique** |
| `www.nozaybad.fr` | `nba-website` | 301 vers l'apex |
| `my.nozaybad.fr` | `nba-storefront` | espace adhérent |
| `admin.nozaybad.fr` | `nba-admin` | administration, derrière Cloudflare Access |
| `staging-www` / `staging-my` / `staging-admin` | Workers `-staging` | préproduction, `noindex` + `robots.txt` fermé |

Le 301 vers l'hôte canonique n'énumère aucun de ces noms : `apps/website/src/middleware.ts`
redirige *tout* hôte différent de `new URL(SITE_URL).hostname`. Attacher un nouvel alias
au Worker suffit donc à le faire rediriger.

`cache.nozaybad.fr` n'existe pas et ne doit **pas** être créé : les clés de cache
utilisent les hôtes fictifs `cache.local` (site public) et `api-cache.local` (API).

## 3. Conséquences

- **Le retour arrière vers WordPress n'est plus instantané.** Il faut supprimer le
  Custom Domain, recréer `A 217.160.0.98` + `AAAA 2001:8d8:100f:f000::27f` proxifiés, et
  compter une dizaine de minutes. Le retour arrière vers *la version précédente du site*
  reste lui immédiat et indépendant du DNS (`rollback.yml`).
- **Un conflit de domaine fait échouer le déploiement** au lieu de diverger en silence.
  C'est le comportement recherché ; le retour arrière est le retrait de la clé `routes`.
- **Changer l'hôte du site public reste une opération à trois commits solidaires** :
  `SITE_URL` (`apps/website/wrangler.json`), `PUBLIC_WEBSITE_URL` (les `astro.config.mjs`
  d'admin **et** de storefront, où elle est inlinée au build et construit la CSP
  `img-src` — l'oublier casse les images sans message) et les hôtes de
  `scripts/build-env.mjs`. Ce point est inchangé.
- **Le cache reste celui du Worker.** Le HTML ne porte pas d'en-tête `cf-cache-status` :
  la Cache API du Worker fait le travail, pas le cache de zone. À revérifier après toute
  bascule, le Worker devenant l'origine.

## 4. Le DNS n'est pas que la plateforme

La zone porte aussi la messagerie, dont la plateforme ne s'occupe pas mais qu'elle
partage : MX IONOS, SPF, DMARC, DKIM Google, DKIM IONOS (`s1-ionos`/`s2-ionos`) et DKIM
Resend, plus le chemin de retour `send.nozaybad.fr` utilisé par les envois transactionnels.

**Piège constaté le 17/09/2026** : un CNAME de DKIM ou d'`autodiscover` laissé
**proxifié** (nuage orange) résout vers des IP Cloudflare au lieu de la cible — la
requête TXT ne renvoie plus rien et les courriels partent sans signature valide, sans
aucune erreur visible. Tout enregistrement de service (DKIM, autodiscover, chemin de
retour) doit rester **DNS only**.
