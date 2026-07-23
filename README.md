# Nozay Badminton (NBA 91) - Monorepo

Plateforme de gestion complète pour le club de badminton de Nozay (NBA 91). Ce monorepo réunit le backend API, le portail d'administration et le site public.

## 🛠️ Stack Technique

- **Monorepo & Architecture** : NX Monorepo, Vertical Slice Architecture (VSA).
- **Backend & API** : Hono, Cloudflare Workers, Cloudflare D1 (SQLite), Drizzle ORM, TypeBox (`@sinclair/typebox`).
- **Applications Web** : AstroJS, Svelte 5, `@lucide/svelte`, TailwindCSS v4.
- **Outillage & Qualité** : TypeScript, Vitest, ESLint.

## 📱 Applications (`apps/`)

- **`apps/api`** : API REST Hono déployée sur Cloudflare Workers (`nba-api`). Gère le domaine comptabilité, la gestion des adhérents, la boutique et les notes de frais.
- **`apps/admin`** : Portail d'administration développé avec Astro & Svelte (`nba-admin`). Permet aux membres du bureau de gérer la comptabilité, le rapprochement bancaire IA, les adhésions et la boutique.
- **`apps/storefront`** : Site public et espace adhérents (`nba-storefront`). Propose la boutique en ligne du club, la soumission des notes de frais et les services adhérents.

## 🚀 Commandes Essentielles

### Développement
```bash
# Lancer l'API en local (Wrangler / Cloudflare Workers)
npx wrangler dev --config apps/api/wrangler.json

# Lancer l'administration ou le site public en dev
npx astro dev --root apps/admin
npx astro dev --root apps/storefront
```

### Tests & Qualité
```bash
# Exécuter l'ensemble des tests unitaires et d'intégration
npx vitest run

# Vérification du typage TypeScript
npx tsc --noEmit

# Vérification du linter ESLint
npx eslint .
```

### Build & Déploiement
```bash
# Build des applications
npx astro build --root apps/admin
npx astro build --root apps/storefront
```

Le déploiement continu (CD) vers Cloudflare est automatisé via GitHub Actions sur la branche `staging` (les déploiements peuvent être forcés en incluant `force deploy` dans le message de commit).

## 📚 Documentation & Architecture

Pour approfondir la structure du projet, les règles d'architecture et la documentation fonctionnelle :
- [Documentation Architecture](docs/architecture/README.md)
- [Standards d'Agent & Directives](AGENTS.md)
