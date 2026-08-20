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
6. **`ui/` (optionnel)** : Si le cas d'usage inclut des composants d'interface Svelte/Astro, ils doivent obligatoirement être placés dans le sous-dossier `ui/` de la tranche (`<capacité>/<nom-du-cas>/ui/` ou `<nom-du-cas>/ui/`).

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

---

## 7. Contrôles d'Intégrité de Schéma (CI / Pre-commit)

Le script `node scripts/check-schema-integrity.js` valide automatiquement 5 règles d'intégrité de schéma avant chaque déploiement :
1. **Résolution du schéma** : Le glob de `libs/shared/db/drizzle.config.ts` résout bien tous les `schema.ts` de domaine.
2. **Unicité des définitions de tables** : Chaque table physique D1 (`sqliteTable`) est déclarée dans un seul `schema.ts` propriétaire.
3. **Dérive du schéma (Schema Drift)** : `drizzle-kit generate` s'exécute sans produire de migration SQL non vide.
4. **Conservation des contraintes (FK, UNIQUE, CHECK)** : Détection automatique de toute suppression non intentionnelle de contraintes. Toute suppression volontaire exige la dérogation `[allow-constraint-loss]` dans le message de commit.
5. **Alignement des données de référence** : Tous les codes métiers requis (`categories`, `account_classes`, `accounts`, `payment_methods`) sont présents dans `0001_seed_reference_data.sql`.


---

## 8. Modèle de Branches et Déploiement (Trunk-Based)

### 8.1 Une seule branche durable

`main` est la seule branche de long terme. Les branches `feat/*` sont **locales et courtes** — moins d'une journée. Une fonctionnalité inachevée est fusionnée dans `main` **éteinte derrière un drapeau** (`vars` du `wrangler.json` concerné, comme `PUSH_REMINDERS_ENABLED`), jamais laissée à mûrir sur une branche.

Le modèle précédent couplait une branche à un environnement : promouvoir demandait un merge, donc se remettait à plus tard, et `main` avait fini par accuser 601 commits de retard. Ici, l'écart entre préproduction et production s'exprime en **numéro de version**, pas en divergence de branches.

### 8.2 Les trois workflows

| Workflow | Déclencheur | Effet |
|---|---|---|
| `deploy.yml` | push sur `main`, PR vers `main` | Tests, puis déploiement **staging** des applications affectées |
| `promote.yml` | manuel (`workflow_dispatch`) | Reconstruit un tag et déploie les **4 Workers de production** |
| `rollback.yml` | manuel | `wrangler rollback` sur un Worker de production |

`promote.yml` redéploie **les 4 Workers sans exception**. Pas de `nx affected` : on promeut un tag dont on ignore l'écart avec ce qui tourne réellement, une promotion doit être rejouable, et les Workers sont couplés par service bindings — une promotion partielle produirait une flotte mélangeant deux versions de `@nba/db`.

Le job `guard` refuse tout ref qui n'est pas un ancêtre de `main` ou qui n'a pas de run vert de `deploy.yml`. **On ne promeut que des tags postérieurs à l'adoption de ce modèle** : `promote.yml` charge l'action composite depuis l'arbre du ref promu, absente des tags antérieurs.

### 8.3 On promeut un commit, pas un binaire

Astro/Vite **inline** `PUBLIC_APP_ENV`, la clé VAPID publique et les URL croisées au build : un bundle est cuit pour un environnement. Les versions Cloudflare, elles, sont propres à un Worker — on ne promeut pas une version de `nba-api-staging` vers `nba-api`. L'unité de promotion est donc le **commit SHA**, reconstruit avec les valeurs de production.

`scripts/build-env.mjs` dérive ces valeurs plutôt que de les recopier — la clé VAPID est lue dans `apps/api/wrangler.json`, ce qui garantit qu'elle reste identique à celle du Worker qui signe les envois. Son mode `--verify` relit `dist/` après le build et échoue si un marqueur de l'autre environnement s'y trouve : `astro.config.mjs` retombe sur `'production'` quand `PUBLIC_APP_ENV` est absent, donc un oubli ne se verrait pas autrement.

### 8.4 Configuration par environnement

Les trois applications Astro se déploient depuis `dist/server/wrangler.json`, généré par l'adaptateur, qui **aplatit l'environnement par défaut** : `wrangler deploy --env staging` n'a aucun effet sur elles. `scripts/patch-wrangler.mjs` applique le bloc `env.<nom>` du `wrangler.json` source sur cette configuration générée, avec les sémantiques de wrangler (**remplacement**, pas fusion — d'où la répétition de `EMAIL_FROM` et `SITE_URL` dans les blocs).

Les blocs `env.staging` sont donc la **source unique** : ce qui est déployé est ce qui est écrit dans le dépôt. `node scripts/patch-wrangler.mjs --check` vérifie que racine et `env.staging` déclarent les mêmes clés — sans quoi une ressource définie d'un seul côté devient une ressource de production utilisée en préproduction. Ce contrôle tourne en CI et en pre-push.

Seul `apps/api` conserve `--env staging` natif : sa configuration n'est pas redirigée par l'adaptateur.

### 8.5 Versions et retour arrière

`@semantic-release/git` a été retiré : **la CI ne pousse plus aucun commit**. Il ne reste que le tag et la GitHub Release, qui porte les notes de version. En conséquence, `package.json` est figé à `0.0.0-semantically-released` et n'est plus la source de la version — celle-ci est transmise aux builds par `VITE_APP_VERSION`. Quand aucune version n'est publiée (un commit `ci:` ou `chore:` n'incrémente rien), le badge retombe sur le SHA court du commit déployé.

**L'écran « Nouveautés » et le splash screen.** `apps/admin/src/pages/changelog.astro` importe `CHANGELOG.md`, et le splash de `apps/admin/src/layouts/Layout.astro` affiche la version. Tous deux étaient alimentés par le commit de release ; sans lui, `scripts/generate-changelog.mjs` reconstitue `CHANGELOG.md` depuis les Releases GitHub avant chaque build de l'admin, et le splash lit `PUBLIC_APP_VERSION` comme le badge de la barre latérale. Le fichier reste versionné pour servir de repli en développement local, où aucun jeton n'est disponible. `docs/changelog-archive.md` porte l'historique antérieur : les versions v1.0.0 à v1.0.2 ont un tag mais aucune Release — le plugin qui les crée n'existait pas encore — donc l'API ne les renverra jamais.

`@semantic-release/github` tourne avec `successComment`, `failComment`, `failTitle` et `releasedLabels` **tous désactivés** : ces fonctions commentent et étiquettent les issues et les PR, ce qui exigerait `issues: write` et `pull-requests: write` sur le workflow. Le `GITHUB_TOKEN` n'a que `contents: write`, suffisant pour créer la Release — les activer échouerait sur « Resource not accessible by integration ». C'est un choix de moindre privilège, pas un oubli.

Pour revenir en arrière, lancer **Rollback production**. Chaque `wrangler deploy` crée une version : le rollback est immédiat et ne reconstruit rien. Deux limites — rétention des **100 dernières versions**, et rollback **refusé si un binding a changé** entre les deux versions (KV, R2, D1, queues), ce qui protège contre les incohérences de schéma. Dans ce cas, relancer `promote.yml` sur le tag précédent.

### 8.6 Ce qu'un rollback ne fait pas : la base

**`wrangler rollback` ne revient que sur le code du Worker. Il ne touche jamais D1.** Le schéma reste en avant pendant que le code recule.

C'est sans danger tant que les migrations sont **additives** — nouvelle table, nouvelle colonne : l'ancien code les ignore. C'est cassant dès qu'une migration est destructive : colonne supprimée ou renommée, contrainte `NOT NULL` ajoutée. L'ancien code interroge alors une colonne absente et renvoie des 500.

Piège à connaître : Cloudflare refuse un rollback quand un **binding** a changé, mais un changement de **schéma D1 n'en est pas un**. Cette protection ne couvre donc pas la dérive de schéma.

**Règle : une version contenant une migration destructive n'est pas rollbackable.** Appliquer le motif *expand/contract* — ajouter dans une version, déployer le code, supprimer dans une version ultérieure — et corriger par une migration en avant plutôt que par un retour arrière.

Pour la base elle-même, le mécanisme est **D1 Time Travel** (30 jours de rétention) :

```bash
npx wrangler d1 time-travel info nba-db
npx wrangler d1 time-travel restore nba-db --timestamp=<ISO8601>
```

Il ramène **toute** la base à l'instant choisi : les écritures des adhérents entre-temps sont perdues. C'est un dernier recours en cas de corruption, jamais une manœuvre de routine.

### 8.7 Couplage implicite à connaître

Le déclenchement des migrations D1 n'a **aucun mécanisme dédié** : il repose sur le fait que `libs/shared/db/migrations/` se trouve sous le `projectRoot` du projet Nx `@nba/db`, dont `api` dépend. Déplacer ce répertoire romprait le lien en silence. Le test `couplage migrations ↔ déploiement` de `libs/migrations.test.ts` verrouille cette propriété.

### 8.8 Limites d'exploitation

**5 cron triggers maximum par compte** (plan Workers Free, erreur API 10072). La production en consomme 3 ; `apps/api/wrangler.json` porte donc `env.staging.triggers.crons: []` — **le tableau vide est obligatoire**, sans lui l'environnement hérite des crons de la racine.
