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

Les apps (`admin`, `storefront`) appellent le worker API via le **binding de
service** `API_SERVICE → nba-api`. Pour que ce binding se connecte, le worker API
doit tourner **avant** de démarrer une app. Utilisez des ports fixes et **deux
terminaux** :

```bash
# Terminal 1 — API (à lancer EN PREMIER), port fixe 8787
npm run dev:api

# Terminal 2 — une fois l'API prête, l'app admin (4321) ou le storefront (4322)
npm run dev:admin        # → http://localhost:4321
npm run dev:storefront   # → http://localhost:4322
```

> Sans API démarrée d'abord, le binding `API_SERVICE` ne se résout pas et les
> pages s'affichent avec des données vides (fallback).
>
> Astro 7 gère un serveur de dev en arrière-plan (`astro dev status` / `astro dev
> stop` / `astro dev logs`). Au **tout premier** démarrage, la compilation Vite
> des libs `@nba/ui` (exclues d'`optimizeDeps` pour le HMR) peut dépasser le
> délai de 30 s et afficher « Dev server failed to start within 30s » : relancer
> la commande une fois le cache `.vite` réchauffé démarre alors rapidement.

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
