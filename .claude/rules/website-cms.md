---
paths:
  - "apps/website/**"
  - "libs/domains/cms/**"
  - "libs/shared/html/**"
  - "apps/api/src/content-version.ts"
---

# Site public et CMS

## Astro

- Rendu serveur par défaut ; îlot hydraté seulement pour l'interactivité, avec la directive la plus paresseuse possible (`client:visible`, `client:idle`). Contenu statique en composants `.astro`.
- Le contenu à indexer est dans le HTML serveur ; 1 URL = 1 page. SEO par `lib/seo.ts` et `lib/jsonld.ts` (meta, Open Graph, JSON-LD).
- Images : **pas de `<Image />`** (`imageService: 'passthrough'`). Les déclinaisons sont produites à l'envoi et servies sous `/media/<clé>/<largeur>.webp` : utiliser `srcset`/`sizes`, `width`/`height` toujours, `loading="lazy"` hors premier écran, `fetchpriority="high"` sur l'image LCP.
- `robots.txt` interdit `/*?` : le sitemap est le seul chemin de découverte des articles. Une liste paginée ou filtrée par la chaîne de requête doit avoir ses URL dans le sitemap.

## Cache : la cause n°1 des « ma modif ne s'affiche pas »

- Deux couches indexées sur `cms_content_version` : `withPageCache` (pages, y compris **en dev**) et `withDataCache` (chaque lecture d'API). Le seul geste d'invalidation est d'incrémenter la version ; seul le CMS le fait dans son domaine, les autres domaines dont les données paraissent sur le site invalident depuis `apps/api/src/content-version.ts` (middleware après `next()`, `await`é, erreur avalée).
- `canonicalQuery()` (`lib/cache.ts`, table `QUERY_RULES`) : toute page qui dépend d'un nouveau paramètre de requête y ajoute sa règle, sinon la première variante rendue est resservie à toutes.
- Un rendu dégradé (5xx, liaison morte) n'est jamais rangé. Une page qui refuse d'entrer en cache = chercher une lecture d'API en échec.
- En dev, le CSS scopé peut rester périmé au démon : `astro dev stop && astro dev start`, puis incrémenter la version.

## HTML riche

`@nba/html` assainit sans DOM, par profils. **Ne jamais élargir `ANNOUNCEMENT_PROFILE`** pour un besoin du site : ajouter au `CMS_PROFILE` (`libs/shared/html/src/profile.ts`). Invariants du CMS : `src` d'image limité à `/media/…`, `rel` calculé depuis `target`, `h1` ramené à `h2`.
