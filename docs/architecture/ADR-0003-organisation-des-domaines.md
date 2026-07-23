# ADR-0003: Organisation des domaines et découpage par capacité métier dans l'architecture Vertical Slice (VSA)

- **Statut** : Accepté
- **Date** : 2026-07-23
- **Décideurs** : Équipe d'architecture NBA

---

## 1. Contexte

Le monorepo `nozay-bad` est organisé en architecture Vertical Slice (VSA) et DDD léger sous la racine `libs/domains/`. L'audit de la structure actuelle des quatre domaines métier révèle une coexistence de deux conventions d'organisation d'arborescence :

| Domaine | Nombre de Slices | Organisation actuelle dans `libs/domains/` |
| :--- | :---: | :--- |
| **accounting** | 36 | Découpage technique en `commands/` (24 slices) et `queries/` (12 slices) |
| **shop** | 7 | Découpage à plat directement sous la racine du domaine (`libs/domains/shop/<slice>`) |
| **members** | 4 | Découpage à plat directement sous la racine du domaine (`libs/domains/members/<slice>`) |
| **expenses** | 3 | Découpage à plat directement sous la racine du domaine (`libs/domains/expenses/<slice>`) |

Cette asymétrie soulève des questions sur la cohérence architecturale du monorepo et présente plusieurs limites fondamentales :

1. **Faux motif CQRS (Fausse promesse d'architecture)** : Les répertoires `commands/` et `queries/` d'accounting ne mettent en œuvre ni modèle de lecture/écriture séparé, ni projections asynchrones, ni bases distinctes. Ils partagent les mêmes fichiers `repository.ts`, ciblent les mêmes tables SQLite/D1 et s'exécutent dans le même Worker Cloudflare. L'utilisation du vocabulaire CQRS crée une attente trompeuse pour les développeurs et les agents IA.
2. **Violation du principe premier du standard VSA** : La règle fondamentale édictée dans `.packmind/standards/vertical-slice-architecture-vsa-standards.md` impose de regrouper le code par **cohérence fonctionnelle (Feature Slice)**. Classer une tranche selon qu'elle lit ou écrit en base (`queries/` vs `commands/`) constitue une réintroduction d'un découpage par couche technique au sein du domaine.
3. **Réalité métier déjà structurée dans le code** : Le barrel file `libs/domains/accounting/index.ts` regroupe et documente déjà les 36 tranches en **6 capacités métier distinctes** à travers ses commentaires et ses montages de routes :
   - `seasons` (10 tranches)
   - `config` / Catégories & Classes de comptes (8 tranches)
   - `invoices` (6 tranches)
   - `bank-transactions` (5 tranches)
   - `transactions` (4 tranches)
   - `checks` (3 tranches)
4. **Fragilité des garde-fous ESLint et ambiguïté pour les agents d'IA** : En présence d'une profondeur variable d'arborescence (2 niveaux pour les domaines à plat, 3 niveaux pour accounting), la règle d'isolation inter-tranches (`no-restricted-imports`) doit jongler avec des motifs d'importation relatifs hétérogènes (`../!(shared)` vs `../../!(shared)`). Pour les assistants de code basés sur des LLM, cette ambiguïté structurelle augmente le risque de prédictions erronées sur les chemins d'accès (`import ... from '../../shared'`).

---

## 2. Décision

Nous retenons l'**Option (c) : Regrouper les domaines volumineux par capacité métier (Bounded Contexts / Sub-capabilities), les domaines sous le seuil restant à plat en tant que domaines mono-capacité**.

### Règle générale retenue (Explicite et Mécanisable)
> **Règle des 10 Slices ($N = 10$)** :
> 1. Un domaine comportant **moins de 10 tranches verticales ($< 10$)** est structuré **à plat** sous sa racine : `libs/domains/<domaine>/<slice>/`.
> 2. Dès qu'un domaine atteint ou dépasse **10 tranches verticales ($\ge 10$)**, il doit être découpé en sous-dossiers par **capacité métier** : `libs/domains/<domaine>/<capacite>/<slice>/`.
> 3. La séparation technique `commands/` et `queries/` est **définitivement proscrite** de l'ensemble des domaines.

### Justification du seuil $N = 10$
- **En dessous de 10 tranches** (ex: `expenses` [3], `members` [4], `shop` [7]) : Le domaine représente un périmètre fonctionnel homogène. L'arborescence à plat compte moins de 15 éléments au total (avec `shared/` et `index.ts`), offrant une lisibilité parfaite dans l'IDE sans créer de sur-profondeur inutile.
- **À partir de 10 tranches** (ex: `accounting` [36]) : Une liste à plat de 36 répertoires devient illisible, rend la recherche visuelle laborieuse et sature le contexte des agents IA. Le regroupement par capacité métier redécoupe le domaine volumineux en sous-ensembles cohésifs de 3 à 10 tranches (ex: `accounting/invoices/create-invoice`), restaurant une clarté optimale.

---

## 3. Analyse comparative des trois options

### Option (a) : Généraliser `commands/` et `queries/` aux quatre domaines

- **Description** : Structurer l'ensemble des 4 domaines avec un sous-dossier `commands/` et `queries/` (ex: `libs/domains/members/queries/list-members/`).
- **Coût de migration** : Moyen (déplacement des tranches de `members`, `expenses`, `shop` et mise à jour des imports).
- **Conformité au standard VSA** : ❌ **Non conforme**. Réintroduit un classement par nature d'opération technique (lecture vs écriture) en contradiction directe avec le standard VSA Packmind.
- **Lisibilité à 36 slices** : ⚠️ **Moyenne**. Sépare artificiellement la lecture et l'écriture d'un même concept métier (`create-invoice` dans `commands/` et `get-invoice` dans `queries/`).
- **Robustesse ESLint** : 🟢 **Bonne**. Uniformise la profondeur à 3 niveaux pour tous les domaines (`../../shared`).
- **Lisibilité pour les agents IA** : 🔴 **Mauvaise**. Enttretient la confusion sur un prétendu motif CQRS/événementiel qui n'existe pas dans le code.

### Option (b) : Aplatir `accounting` pour l'aligner sur les trois autres

- **Description** : Supprimer `commands/` et `queries/` d'accounting et placer l'ensemble des 36 tranches directement à la racine de `libs/domains/accounting/`.
- **Coût de migration** : Moyen (déplacement de 36 dossiers et ajustement des chemins relatifs `../../shared` vers `../shared`).
- **Conformité au standard VSA** : 🟢 **Conforme**. Élimine la couche technique `commands/queries`.
- **Lisibilité à 36 slices** : 🔴 **Très mauvaise**. Produit un dossier racine contenant 38 éléments à plat (`shared/`, `index.ts` + 36 tranches), provoquant de la confusion visuelle.
- **Robustesse ESLint** : 🟢 **Bonne**. Uniformise la profondeur à 2 niveaux pour tous les domaines (`../shared`).
- **Lisibilité pour les agents IA** : ⚠️ **Moyenne**. L'agent perd la notion de regroupement logique des sous-domaines (Factures, Saisons, Rapprochement).

### Option (c) : Regrouper `accounting` par capacité métier (Option Retenue)

- **Description** : Remplacer `commands/` et `queries/` dans `accounting` par des répertoires représentant les 6 capacités métier identifiées (`seasons/`, `config/`, `invoices/`, `bank-transactions/`, `transactions/`, `checks/`). Les domaines sous le seuil ($< 10$) restent à plat.
- **Coût de migration** : Moyen (déplacement des 36 tranches d'accounting vers leurs répertoires de capacités respectifs, réalignement des imports relatifs).
- **Conformité au standard VSA** : ✅ **Excellente**. Respecte l'essence même de VSA et du DDD : regroupement par responsabilité et domaine fonctionnel.
- **Lisibilité à 36 slices** : ✅ **Excellente**. L'arborescence reflète directement la carte des fonctionnalités métier. Les cas d'usage liés (lecture et écriture d'une facture) vivent côte à côte dans `accounting/invoices/`.
- **Robustesse ESLint** : ✅ **Excellente**. Les règles ESLint `no-restricted-imports` distinguent clairement les domaines à plat (profondeur 2) des domaines découpés par capacités (profondeur 3) grâce à des motifs ciblés sur le tag Nx ou le chemin.
- **Lisibilité pour les agents IA** : ✅ **Excellente**. Règle déterministe et mécanisable : un agent sait exactement où placer ou chercher une tranche selon son domaine et sa capacité métier.

---

## 4. Audit des contradictions relevées

Lors de l'analyse, trois contradictions entre la documentation, les standards et le code réel ont été constatées :

1. **Contradiction entre `04-vsa.md` et le standard VSA Packmind** :
   - `docs/architecture/04-vsa.md` (règle 12) préconisait le rangement dans `commands/` et `queries/` pour les gros domaines.
   - `.packmind/standards/vertical-slice-architecture-vsa-standards.md` exige un regroupement par fonctionnalité (Feature Slice) et proscrit les couches techniques.
   - *Résolution* : `docs/architecture/04-vsa.md` et `docs/architecture/02-folder-structure.md` doivent être mis à jour pour entériner l'ADR-0003 et remplacer la mention `commands/queries` par le découpage en capacités métier.

2. **Illusion de CQRS** :
   - La présence de `commands/` et `queries/` suggérait l'existence d'une architecture CQRS (Command Query Responsibility Segregation). Or, les handlers lisent et écrivent sur les mêmes modèles Drizzle / D1 sans séparation d'infrastructure.
   - *Résolution* : La suppression de `commands/` et `queries/` clarifie l'architecture en confirmant un modèle Modular Monolith VSA pur.

3. **Ambiguïté de profondeur dans `eslint.config.js`** :
   - Le motif ESLint actuel `files: ['libs/domains/*/*/**/*.ts']` appliquait simultanément des patterns `../!(shared)` et `../../!(shared)` pour absorber l'asymétrie de profondeur d'accounting.
   - *Résolution* : L'adoption de l'ADR-0003 permet de définir des règles ESLint explicites par niveau de domaine.

---

## 5. Conséquences

### Positives
- **Cohérence Métier Maximale** : Le découpage des fichiers reflète le langage ubiquitaire et les capacités métier du club (Saisons, Factures, Banque, Adhérents).
- **Lisibilité et Ergonomie** : Fin des dossiers surchargés à 36 éléments ou séparés artificiellement entre lecture et écriture.
- **Prédictibilité pour l'IA** : Règle déterministe basée sur le seuil $N = 10$, immédiatement vérifiable par script ou linter.
- **Maintien d'un couplage faible** : Les tranches d'une capacité ne s'importent pas entre elles et s'appuient uniquement sur `shared/` du domaine.

### Plan d'Exécution (Prochaine étape)
1. **Mise à jour documentaire** : Mettre à jour `docs/architecture/02-folder-structure.md` et `docs/architecture/04-vsa.md` pour refléter l'ADR-0003.
2. **Refactoring d'Accounting** : Déplacer les 36 tranches de `commands/` et `queries/` vers leurs 6 dossiers de capacités métier (`seasons`, `config`, `invoices`, `bank-transactions`, `transactions`, `checks`).
3. **Mise à jour d'ESLint** : Réajuster `eslint.config.js` avec la nouvelle profondeur uniforme d'accounting.
