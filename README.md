# Nozay Badminton (NBA 91) - Monorepo

Plateforme de gestion complète pour un club de badminton — née pour Nozay (NBA 91), en route vers un service pour tous les clubs. Ce monorepo réunit le backend API, le portail d'administration, l'espace adhérent et le site public. L'identité du club (nom, adresse, banque, documents, fonctionnalités utilisées) se règle depuis l'administration (**Réglages → Configuration du club**), jamais dans le code.

## 🛠️ Stack Technique

- **Monorepo & Architecture** : NX Monorepo, Vertical Slice Architecture (VSA).
- **Backend & API** : Hono, Cloudflare Workers, Cloudflare D1 (SQLite), Drizzle ORM, TypeBox (`@sinclair/typebox`).
- **Applications Web** : AstroJS, Svelte 5, `@lucide/svelte`, TailwindCSS v4.
- **Outillage & Qualité** : TypeScript, Vitest, ESLint.

## 📱 Applications (`apps/`)

- **`apps/api`** : API REST Hono déployée sur Cloudflare Workers (`nba-api`). Gère le domaine comptabilité, la gestion des adhérents, la boutique et les notes de frais.
- **`apps/admin`** : Portail d'administration développé avec Astro & Svelte (`nba-admin`). Permet aux membres du bureau de gérer la comptabilité, le rapprochement bancaire IA, les adhésions, la boutique, les équipes interclubs, les notifications et le contenu du site public. L'accès est gouverné par des rôles (voir `docs/domain/iam/`).
- **`apps/storefront`** : Espace adhérents (`nba-storefront`). Authentification par code à usage unique, boutique en ligne du club, soumission des notes de frais, compositions d'interclubs pour les capitaines et services adhérents.
- **`apps/website`** : Site public du club (`nba-website`). Site vitrine rendu depuis le CMS maison administré dans `apps/admin` : pages, actualités, agenda, créneaux, médiathèque, menus et redirections.

## 🚀 Commandes Essentielles

### Développement

Les apps (`admin`, `storefront`) appellent le worker API via le **binding de
service** `API_SERVICE → nba-api`. Pour que ce binding se connecte, le worker API
doit tourner **avant** de démarrer une app. Utilisez des ports fixes et **deux
terminaux** :

```bash
# Terminal 1 — API (à lancer EN PREMIER), port fixe 8787
npm run dev:api

# Terminal 2 — une fois l'API prête, l'application voulue
npm run dev:admin        # → http://localhost:4321
npm run dev:storefront   # → http://localhost:4322
npm run dev:website      # → http://localhost:4323
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
npx astro build --root apps/website
```

Le dépôt suit un **développement sur tronc unique** : `main` est la seule branche durable.

- **Préproduction** — chaque push sur `main` déploie automatiquement les applications affectées (`.github/workflows/deploy.yml`). Le calcul par `nx affected` peut être court-circuité en incluant `force deploy` dans le message de commit.
- **Production** — déployée uniquement par le workflow manuel **Promote to production**, qui reconstruit un tag donné avec les valeurs de production. Voir CONTRIBUTING.md §8.
- **Retour arrière** — workflow manuel **Rollback production** (`wrangler rollback`), immédiat et sans reconstruction.

## 📚 Documentation & Architecture

Pour approfondir la structure du projet, les règles d'architecture et la documentation fonctionnelle :
- [Principes et règles d'architecture](docs/architecture/01-principles.md) — VSA, DDD, frontières de domaine et ADR
- [Documentation fonctionnelle par domaine](docs/domain/) — glossaire métier et règles fonctionnelles (RF)
- [Standards d'Agent & Directives](AGENTS.md)
