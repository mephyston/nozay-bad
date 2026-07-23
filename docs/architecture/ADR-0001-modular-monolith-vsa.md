# ADR-0001: Architecture Modular Monolith, Vertical Slice Architecture (VSA) et DDD Léger

- **Statut** : Accepté
- **Date** : 2026-07-23
- **Décideurs** : Équipe d'architecture NBA

---

## 1. Contexte

L'application `nba-api` (monorepo Nx) dessert trois applications distinctes déployées sur Cloudflare Workers :
- `apps/api` : Worker HTTP (Hono), point d'entrée API unique.
- `apps/admin` : Back-office de gestion (Astro/Svelte).
- `apps/storefront` : Boutique et vitrine publique (Astro).

L'audit initial de la codebase a révélé plusieurs problèmes structurants causés par un découpage en couches techniques au lieu d'un découpage par cas d'usage (`libs/features/<domaine>/{api,data-access,ui}`) :
- **Couplage inter-domaines incontrôlé** : des modules (ex: `accounting`) modifiaient directement les tables d'autres domaines (ex: `membersTable`).
- **Duplication de schémas** : des tables (ex: `seasons`) étaient redéfinies à plusieurs endroits pour contourner des contraintes d'import.
- **Absence d'encapsulation** : les fichiers d'index exportaient directement les tables Drizzle brutes (`export * from './schema'`).
- **Handlers HTTP monolithiques** : mélange dans un seul fichier de la validation Hono, des calculs métier, des requêtes SQL et du formatage JSON.

---

## 2. Décision

Nous adoptons une architecture structurée autour de quatre piliers :

1. **Modular Monolith** :
   - Un monorepo unique (`Nx`), un seul déploiement par application, mais des frontières logiques strictes et étanches entre domaines (`accounting`, `expenses`, `members`, `shop`).
   - Aucun appel réseau inter-domaines : les échanges restent des appels de fonctions TypeScript *in-process*.

2. **Vertical Slice Architecture (VSA)** :
   - Le code au sein de chaque domaine est organisé par **cas d'usage** (`commands/<cas-usage>` pour l'écriture, `queries/<cas-usage>` pour la lecture seule), et non par couche technique.
   - Chaque tranche verticale contient tous ses éléments colocalisés (`route.ts`, `validator.ts`, `handler.ts`, `repository.ts`, `dto.ts`, `ui/`, `*.test.ts`).

3. **Domain-Driven Design (DDD) léger** :
   - Les agrégats, entités et règles métier pures vivent dans le dossier `shared/` du domaine (`libs/domains/<domaine>/shared/`).
   - Chaque domaine masque son implémentation et n'expose qu'une API publique stricte via son barrel file racine (`libs/domains/<domaine>/index.ts`).

4. **Architecture Hexagonale légère** :
   - Isolation stricte du handler métier (`handler.ts`), qui ne dépend ni de Hono, ni de Drizzle.
   - Accès aux données délégué à un composant repository (`repository.ts`), seul fichier autorisé à importer `drizzle-orm`.

---

## 3. Alternatives écartées

### Alternative 1 : Clean Architecture / Onion Architecture complète
- **Description** : Introduction systématique d'interfaces d'inversion de dépendance pour chaque service, DTOs de conversion à chaque frontière de couche, et contrôleurs séparés.
- **Raison du rejet** : Jugée trop lourde, cérémonieuse et verbeuse par rapport à la taille de l'équipe et à la complexité du projet. VSA offre une isolation équivalente avec un coût d'abstraction bien inférieur.

### Alternative 2 : Microservices
- **Description** : Découpage de chaque domaine métier dans son propre Worker Cloudflare indépendant communiquant par HTTP / réseau.
- **Raison du rejet** : Exclu pour maintenir une compatibilité stricte avec le plan Cloudflare Workers Free (cf. `docs/architecture/00-vision.md`). multiplier les Workers indépendants augmenterait les coûts, la latence réseau inter-services et la complexité d'orchestration.

---

## 4. Conséquences

### Positives
- **Forte cohésion** : Tout le code d'un cas d'usage (du schéma de validation au composant UI) est regroupé au même endroit.
- **Encapsulation stricte** : Les tables SQL d'un domaine ne sont jamais exposées aux autres domaines.
- **Garde-fous automatiques** : Détection des violations d'architecture au build/lint via Nx Module Boundaries et ESLint `no-restricted-imports`.

### Contraintes & Engagements
- Respect strict du gabarit par tranche verticale.
- Limite de 200 lignes maximum par fichier de domaine (checklist `docs/architecture/08-rules.md`).
- Aucune dépendance croisée entre tranches d'un même domaine (`create-invoice` n'importe pas `delete-invoice`).
