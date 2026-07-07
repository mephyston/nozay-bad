# Spécification Technique - Sous-Projet 1 : Initialisation & Authentification CA

Ce document détaille l'architecture et la conception technique du premier lot du projet `nozay-bad` (NBA 91).

## 1. Objectifs
* Mettre en place un monorepo structuré avec **Nx**.
* Configurer les applications et les bibliothèques partagées.
* Configurer la communication privée via **Cloudflare Service Bindings**.
* Sécuriser l'accès à la console d'administration via **Cloudflare Access (Zero Trust)** avec validation JWT.
* Initialiser **Drizzle ORM** avec **Cloudflare D1**.

## 2. Architecture Globale

Le projet est conçu comme un monolithe modulaire dans un monorepo.

```
nba-platform/
├── apps/
│   ├── admin-console/        # Astro (BFF) + Svelte (MPA avec View Transitions)
│   ├── boutique/             # Astro (BFF) + Svelte (Formulaires de vente publics)
│   └── api/                  # Worker Hono (Privé, accès direct à D1)
└── libs/
    └── shared/
        ├── db/               # Schémas Drizzle ORM et scripts de migration D1
        ├── ui/               # Composants Svelte partagés (Tailwind, Shadcn)
        └── core/             # Validation Zod, logique métier commune, types partagés
```

### Communication & Flux
```
[Client] -> HTTP -> [admin-console / boutique (BFF)]
                      └─► (Service Binding) ─► [api (Hono)] ─► [D1 Database]
```

## 3. Configuration des Applications

### 3.1 Apps Frontends (Astro + Svelte + Tailwind)
* **admin-console** : Console d'administration privée pour le CA.
* **boutique** : Interface publique pour l'achat de volants et de cordages.
* **Intégrations Astro** : `@astrojs/svelte` pour les composants réactifs, `@astrojs/tailwind` pour le style.
* **Adaptateur** : `@astrojs/cloudflare` en mode SSR.

### 3.2 App API (Hono Cloudflare Worker)
* Framework : **Hono** pour une écriture fluide des routes API et une exécution ultra-razpide sur le réseau Cloudflare.
* Rôle : Point d'accès unique pour l'écriture et la lecture en base de données D1, traitement de la logique lourde (ex: rapprochement Poona).

### 3.3 Libs Partagées
* **`libs/shared/db`** :
  * Contient le fichier `schema.ts` (définissant les tables D1).
  * Expose le client Drizzle configuré.
  * Héberge les migrations SQL générées par `drizzle-kit`.
* **`libs/shared/ui`** :
  * Composants Svelte réutilisables basés sur Shadcn Svelte.
  * Fichier de configuration Tailwind partagé.
* **`libs/shared/core`** :
  * Schémas de validation avec **Zod** (pour valider les imports Poona, les transactions de la boutique, etc.).
  * Types TypeScript communs.

## 4. Sécurité & Authentification (CA)

L'accès à `admin-console` est protégé par **Cloudflare Access (Zero Trust)**.

### Processus de Validation dans Astro
Toutes les requêtes vers `/admin/*` dans `admin-console` passent par un Middleware Astro (`src/middleware.ts`) :

1. **Extraction** : Récupérer le header `Cf-Access-Jwt-Assertion`.
2. **Validation** :
   * Télécharger (et mettre en cache) les clés publiques (JWKS) depuis `https://<your-team>.cloudflareaccess.com/cdn-cgi/access/certs`.
   * Valider la signature et l'expiration du token JWT.
   * Valider l'Audience (`aud`) du token (l'identifiant de l'application Cloudflare Access).
3. **Context** : Injecter les informations de l'utilisateur (e-mail) dans `Astro.locals.user`.
4. **Refus d'accès** : Si le token est absent ou invalide, retourner une réponse HTTP `401 Unauthorized` ou rediriger.

## 5. Base de données (Drizzle + D1)
* Base de données : **Cloudflare D1** (moteur SQLite managé).
* ORM : **Drizzle ORM** pour un typage TypeScript strict des requêtes et un outil de migration léger (`drizzle-kit`).
* Les migrations seront appliquées sur D1 via Wrangler CLI lors du déploiement.

---

## 6. Critères d'Acceptation (Sous-Projet 1)
* [ ] Le monorepo Nx est initialisé sans erreur.
* [ ] Les 3 applications (`admin-console`, `boutique`, `api`) démarrent en local via `wrangler` ou le serveur de dev.
* [ ] Le Service Binding entre Astro et le Worker Hono fonctionne localement (via wrangler pages dev/wrangler dev).
* [ ] Le middleware de validation JWT Cloudflare Access est écrit et testé (avec un mock de jeton JWT pour le développement local).
* [ ] La configuration Drizzle/D1 est opérationnelle avec une première table de test (ex: table `users` ou `config`).
