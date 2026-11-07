# nozay-bad — instructions pour les agents

Plateforme de gestion d'un club de badminton (adhérents, comptabilité, boutique, interclubs, site public), en route vers un service multi-clubs. Monorepo Nx, Cloudflare Workers sur le plan gratuit, D1 (SQLite) + Drizzle, Hono + TypeBox, Astro 7 + Svelte 5 + Tailwind 4. Vit en production : de vrais adhérents et la trésorerie du club en dépendent.

Tout est écrit en **français** : code métier, commentaires, messages de commit, documentation, textes d'interface.

## Carte

| Chemin | Rôle |
|---|---|
| `apps/api` | Worker `nba-api` : l'API Hono, seule à parler à D1 |
| `apps/admin` | Worker `nba-admin` : portail du bureau (Astro + Svelte, PWA) |
| `apps/storefront` | Worker `nba-storefront` : espace adhérent (OTP par courriel, PWA) |
| `apps/website` | Worker `nba-website` : site public rendu depuis le CMS maison |
| `apps/caisse` | Worker `nba-caisse` : caisse des bénévoles derrière Cloudflare Access |
| `apps/buvette` | Worker `nba-buvette` : carte buvette des clients (code par courriel) |
| `libs/domains/<domaine>` | Le métier, en tranches verticales (un dossier par cas d'usage) |
| `libs/shared/*` | Technique transverse uniquement ; `@nba/ui` = design system |
| `libs/shared/db/migrations` | Migrations D1, append-only |
| `docs/domain`, `docs/architecture` | Règles métier (RF + Gherkin), ADR |
| `scripts/check-*` | Garde-fous rejoués par la CI et le hook pre-push |

## Commandes

```bash
npm run dev:api            # d'abord (8787) ; puis dev:admin (4321), dev:storefront (4322), dev:website (4323), dev:caisse (4324), dev:buvette (4325)
npx vitest run [chemins]   # une seule suite ; --changed <base> pour cibler
npx vitest run --config vitest.architecture.config.ts
npm run typecheck          # tsc : ne lit PAS les .svelte
npx nx run-many -t check --projects=admin,website,storefront,caisse,buvette   # astro check
npx nx build <app> --skip-nx-cache
npm run check:env && npm run check:migrations && npm run check:schema && npm run check:nx-deps && npm run check:aliases
```

## Règles

Les conventions du dépôt font foi, dans cet ordre :

1. `.claude/rules/*.md` — règles courtes par sujet, chacune ciblée sur les chemins où elle s'applique (frontmatter `paths:`). Un agent qui ne charge pas ce dossier tout seul lit celles qui concernent les fichiers qu'il touche.
2. `CONTRIBUTING.md` — architecture, alias, schéma, livraison, sécurité.
3. `docs/architecture/` — ADR et checklist `08-rules.md`.

Les procédures récurrentes sont dans `.claude/skills/*/SKILL.md` (nouvelle migration, nouvelle tranche, environnement local, promotion, retour arrière, copie des données de production, article d'aide).

## Ce qui ne se fait jamais sans demande explicite

- Toute écriture sur la production : `wrangler deploy`, `d1 execute|migrations apply --remote` sans `--env staging`, secrets, rollback, Time Travel, workflows `promote`/`rollback`.
- Retoucher une migration déjà sur `origin/main`.
- Réécrire l'historique partagé (`push --force`, `reset --hard`), `stash` nu, `git add -A` : d'autres sessions travaillent dans le même dépôt.
