# Guide de Contribution (CONTRIBUTING)

Ce document définit les règles d'architecture, l'organisation du code et la méthodologie à respecter pour contribuer au monorepo `nba-api`.

---

## 1. Architecture Générale

Le projet est un **Modular Monolith** organisé par domaines métier dans `libs/domains/` :
- `accounting` (saisons, transactions, factures, chèques, rapprochement bancaire)
- `expenses` (notes de frais)
- `members` (adhérents, cotisations, licences)
- `shop` (produits, commandes, articles)

Chaque domaine est structuré en **Vertical Slice Architecture (VSA)** : le code est découpé par **cas d'usage**, et non par couche technique.

---

## 2. Créer un Nouveau Cas d'Usage (Vertical Slice)

### Emplacement
Chaque cas d'usage vit dans son propre dossier sous le domaine concerné :
- **Commandes (écriture / mutation)** : `libs/domains/<domaine>/commands/<nom-du-cas>/`
- **Requêtes (lecture seule)** : `libs/domains/<domaine>/queries/<nom-du-cas>/`

> *Note : Pour les petits domaines comportant peu de cas d'usage, les tranches peuvent être placées directement à la racine du domaine (`libs/domains/<domaine>/<nom-du-cas>/`).*

### Fichiers obligatoires par tranche

Chaque cas d'usage doit contenir la structure suivante :

```
<nom-du-cas>/
  ├── dto.ts           # Types & interfaces TypeScript de requête / réponse exposés
  ├── validator.ts     # Schéma de validation TypeBox (@sinclair/typebox)
  ├── handler.ts       # Logique d'orchestration métier pure (indépendant de Hono et Drizzle)
  ├── repository.ts    # Accès aux données (seul fichier autorisé à importer drizzle-orm)
  ├── route.ts         # Configuration du router Hono local
  └── handler.test.ts  # Test unitaire ou d'intégration colocalisé
```

### Responsabilités par fichier

1. **`dto.ts`** : Déclare les types de données d'entrée (`InputDTO`) et de sortie (`OutputDTO`).
2. **`validator.ts`** : Utilise `@sinclair/typebox` et `@hono/typebox-validator` (`tbValidator`) pour valider les paramètres (JSON body, query params, path params). Tout échec de validation doit retourner un code HTTP 400 (`{ success: false, error: 'Validation failed: ...' }`).
3. **`handler.ts`** : Contient la fonction métier. Ne contient aucun import de Hono (`c.req`, `c.json`) ni de Drizzle (`eq`, `and`, `db.select`).
4. **`repository.ts`** : Reçoit l'instance de base de données D1/Drizzle et exécute les requêtes SQL. C'est l'**unique endroit** d'une tranche où l'import de `drizzle-orm` est autorisé.
5. **`route.ts`** : Exporte le sous-routeur Hono de la tranche (`export const create<Slice>Route = ...`). Rôle : valider la requête via `validator.ts`, appeler `handler.ts`, et retourner la réponse HTTP.
6. **`ui/` (optionnel)** : Si le cas d'usage inclut des composants d'interface Svelte/Astro, ils doivent obligatoirement être placés dans le sous-dossier `ui/` de la tranche (`commands/<nom-du-cas>/ui/`).

---

## 3. Règles d'Implantation de l'UI

- **Localisation** : Tout composant UI métier doit vivre dans le sous-dossier `ui/` de sa tranche verticale.
- **Interdiction** : Il est strictly interdit d'avoir un dossier `ui/` à la racine d'un domaine ou dans `libs/shared/`.
- **Composants génériques** : Les composants d'interface purement visuels et réutilisables (Button, Input, Card, Modal) vivent exclusivement dans la bibliothèque `@nba/ui` (`libs/shared/ui`).

---

## 4. Utilisation de `libs/shared` vs `libs/domains/<domaine>/shared`

### `libs/shared/` (Technique uniquement)
- Contient uniquement du code technique transverse : connexion de base de données, middlewares HTTP globaux, utilitaires système, composants UI de design system (`@nba/ui`).
- **Interdiction absolue** : `libs/shared` ne doit contenir aucune règle métier, aucune table Drizzle métier, ni aucun catalogue de valeurs fonctionnel.

### `libs/domains/<domaine>/shared/` (Partagé au domaine)
- Contient les éléments partagés entre les cas d'usage d'un même domaine :
  - `schema.ts` : Définition des tables Drizzle du domaine.
  - Agrégats / Entités DDD et règles métier pures.
  - Types d'erreurs spécifiques au domaine.

---

## 5. Étanchéité et Frontières (Boundaries)

1. **API Publique de Domaine** : Chaque domaine expose ses fonctionnalités publiques uniquement via son fichier d'index racine (`libs/domains/<domaine>/index.ts`).
2. **Accès inter-domaines** : Un domaine ne doit jamais importer directement les tables SQL ou les fichiers internes d'un autre domaine.
3. **Isolation des Slices** : Deux tranches verticales d'un même domaine ne doivent jamais s'importer directement entre elles (ex: `create-invoice` n'importe pas `delete-invoice`).
4. **Taille maximale des fichiers** : **200 lignes maximum par fichier** dans un domaine (validé en CI).

---

## 6. Variables d'Environnement et Bindings Cloudflare

1. **Déclaration Obligatoire** : Toute variable d'environnement ou binding Cloudflare lu dans le code (`c.env`, `import.meta.env`, `process.env`, `cfEnv`, etc.) doit obligatoirement être déclaré dans le fichier `wrangler.json` correspondant (environnement par défaut ET `env.staging`) et documenté dans `.env.example`.
2. **Vérification Automatisée** : Le script `node scripts/check-env-declarations.js` est exécuté lors du job de test CI. Toute variable lue dans le code applicatif non déclarée entraînera l'échec immédiat du build.
3. **Secret Key Naming** : Les clés secrètes serveur ne doivent jamais utiliser le préfixe `PUBLIC_` (réservé aux variables injectées au build client). Elles doivent être posées via `wrangler secret put <NOM>`.
