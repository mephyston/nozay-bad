# Plan d'implémentation - Résolution de l'Audit Financier et Technique

Ce plan décrit les actions nécessaires pour corriger les 5 problèmes restants identifiés par l'audit dans le monorépo "nozay-bad".

## 1. Validation d'entrée — TypeBox sur les routes Hono POST/PUT
- Implémenter des schémas TypeBox et des validateurs Hono (`validator('json', ...)` et `validator('form', ...)`) pour :
  - `POST /shop/products`
  - `PUT /shop/products/:id`
  - `POST /shop/orders`
  - `POST /expenses/`
  - `PUT /expenses/:id`
  - `POST /members/import` (uniquement le champ multipart `file`)
- Utiliser `@sinclair/typebox` et `@sinclair/typebox/value`.

## 2. Gestion d'erreurs — middleware global + AppError
- Créer [errors.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/errors.ts) contenant `AppError` avec un status HTTP par défaut (400) et l'exporter depuis le point d'entrée de `shared-db`.
- Configurer `app.onError` dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) de l'API globale pour mapper proprement les instances d'AppError et masquer les erreurs système inattendues.
- Remplacer les levées de `new Error` par `new AppError` dans les contrôleurs d'API des sous-modules (shop, expenses, accounting).

## 3. Dashboard admin — données réelles au lieu de placeholders
- Mettre à jour la page d'accueil d'administration [index.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/index.astro) pour requêter en SSR via `env.API_SERVICE` :
  - Le solde de trésorerie (`GET /accounting/seasons/:activeSeason/balance`)
  - Le nombre total d'adhérents de la saison active (`GET /members?season=:activeSeason&limit=1`)
  - Le nombre d'adhérents payés (`GET /members?season=:activeSeason&paid=true&limit=1`)
- Implémenter le filtrage par paramètre de requête `paid` dans le contrôleur de membres.
- Ajouter la route `/seasons/:seasonId/balance` dans l'API de comptabilité pour calculer la somme des soldes de trésorerie des comptes `current`, `savings` et `cash`.

## 4. Boutique — limiter le chargement des membres
- Supprimer le chargement initial de tous les membres dans [index.astro](file:///Users/david/Lab/nozay-bad/apps/boutique/src/pages/index.astro).
- Créer un point d'accès API Astro [members-search.ts](file:///Users/david/Lab/nozay-bad/apps/boutique/src/pages/api/members-search.ts) pour servir de proxy de recherche.
- Mettre à jour [ShopCatalog.svelte](file:///Users/david/Lab/nozay-bad/apps/boutique/src/components/ShopCatalog.svelte) pour appeler dynamiquement ce proxy de recherche avec un anti-rebond (debounce) de 300ms.

## 5. Limite de taille sur l'import CSV
- Ajouter un middleware d'interception Hono sur la route `POST /members/import` vérifiant l'en-tête `Content-Length` pour rejeter les requêtes dépassant 5 Mo avec un code HTTP 413.

---

### Task 1: Création d'AppError et Configuration du Middleware Global Hono
- Créer `libs/shared/db/src/errors.ts`.
- Exposer `AppError` dans `libs/shared/db/src/index.ts`.
- Intégrer le middleware global `app.onError` dans `apps/api/src/index.ts`.
- Vérifier la compilation et les tests existants.

### Task 2: Schémas et Validation TypeBox sur les Routes d'Écriture
- Mettre en place la validation et le typage statique dans `libs/features/shop/api/src/routes.ts`.
- Mettre en place la validation et le typage statique dans `libs/features/expenses/api/src/routes.ts`.
- Mettre en place la validation et le typage statique dans `libs/features/members/api/src/routes.ts`.
- Remplacer les throw `new Error` par `new AppError` dans ces routes.

### Task 3: Ajout de l'API de Balance de Trésorerie et Filtrage par Paiement
- Implémenter l'API `GET /seasons/:seasonId/balance` dans `libs/features/accounting/api/src/routes.ts`.
- Ajouter le support du filtre de requête `paid` dans `GET /members` (`libs/features/members/api/src/routes.ts`).
- Convertir les erreurs de l'API accounting pour utiliser `AppError`.

### Task 4: Raccordement du Tableau de Bord d'Administration aux Données Réelles
- Récupérer et afficher les métriques réelles dans `apps/admin-console/src/pages/index.astro`.
- Gérer les cas d'erreurs de connexion.

### Task 5: Optimisation du Catalogue Boutique et Autocomplétion Dynamique des Membres
- Modifier le chargement dans `apps/boutique/src/pages/index.astro`.
- Implémenter l'API de recherche dans `apps/boutique/src/pages/api/members-search.ts`.
- Mettre à jour `ShopCatalog.svelte` pour utiliser l'autocomplétion dynamique avec debounce.

### Task 6: Validation Globale et Poussée
- Exécuter la suite complète de tests Vitest, Astro check, ESLint.
- Pousser le travail finalisé.
