---
paths:
  - "apps/website/**"
  - "apps/storefront/**"
  - "apps/admin/src/layouts/**"
  - "apps/*/public/**"
  - "libs/shared/security-headers/**"
---

# Performance web

Cibles, mesurées sur mobile milieu de gamme en 4G (p75) : **LCP < 2,5 s, INP < 200 ms, CLS < 0,1, TTFB < 500 ms**. Budgets par page : JS 465 Ko, CSS 68 Ko, polices 108 Ko, images 870 Ko.

## Cache HTTP

- HTML public : `no-cache` (revalidation) ; HTML de l'admin et de l'espace adhérent : `private`, jamais servi à un autre visiteur. `no-store` réservé aux données sensibles (et à l'admin, cf. `ui-svelte.md`).
- Assets empreintés : `public, max-age=31536000, immutable`. `stale-while-revalidate` pour ce qui peut être servi un peu vieux.
- Le réglage *Browser Cache TTL* de la zone Cloudflare écrase un `max-age=0` : il doit rester sur « Respect existing headers ».
- bfcache : pas d'`unload`, utiliser `pagehide`/`pageshow`.

## JavaScript

- Rien de bloquant : `type="module"`/`defer` ; `async` uniquement pour un script autonome.
- Imports nommés (tree-shaking), découpage par page, `import()` pour ce qui n'est pas visible au chargement.
- Animations sur `transform`/`opacity`, jamais sur `width`/`height`/`top`/`left`.
- Scripts tiers : 3 à 5 maximum, chargés après `load` ou à l'interaction, façade pour les widgets lourds (carte, vidéo), avec délai d'abandon. Consentement avant tout traceur.

## Polices

WOFF2 auto-hébergé, sous-ensemble latin, `font-display: swap`, 2 à 3 graisses au plus (police variable de préférence), `preload` + `crossorigin` pour la police critique, pile de repli aux métriques proches pour limiter le CLS.

## Images

AVIF/WebP, qualité 85-90, `srcset` plafonné à 2x, SVG optimisé pour logos et icônes, espace réservé (dimensions explicites) pour tout contenu chargé après coup.

## Divers

`<meta name="viewport">` sur toute page ; Gzip/Brotli (fait par Cloudflare) ; `Timing-Allow-Origin` sur les images servies depuis une autre origine pour mesurer le LCP.
