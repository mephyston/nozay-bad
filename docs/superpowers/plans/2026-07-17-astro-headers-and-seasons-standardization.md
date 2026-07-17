# Plan d'implémentation - Standardisation des En-têtes Astro et des Sélecteurs de Saisons

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uniformiser l'affichage des en-têtes (titre, description, sélecteur de saison et badge de clôture) au niveau des pages Astro (`.astro`) et nettoyer les composants Svelte (`.svelte`) correspondants pour les rendre indépendants de la gestion globale de l'exercice comptable.

**Architecture:** Extraction de la logique de sélection de saison et de titre vers l'Astro Controller (avec script de rechargement par URL `?season=xx-yy`). Les composants Svelte reçoivent `seasonId` et `seasons` en tant que props en lecture seule et adaptent leur interface (désactivation des boutons de modification si la saison est clôturée).

**Tech Stack:** AstroJS, Svelte 5 (Runes), Tailwind CSS v4, Vitest, `@metacult/shared-ui`.

## Global Constraints
- Préserver l'intégralité du typage TypeScript et de la couverture de tests unitaires.
- Éviter de briser les styles Tailwind existants lors de la migration.
- Tous les tests de la suite Vitest (`npx vitest run`) doivent passer après chaque tâche.
- Zéro erreur lint ESLint et compilation Astro Check.

---

### Task 1: Standardisation pour la Caisse (cash-box.astro & CashBoxManager.svelte)

**Files:**
- Modify: `apps/admin-console/src/pages/admin/accounting/cash-box.astro`
- Modify: `libs/features/accounting/ui/src/CashBoxManager.svelte`
- Test: `libs/features/accounting/ui/src/CashBoxManager.test.ts`

- [ ] **Step 1: Mettre à jour cash-box.astro**
  Ajouter le titre, la description, le sélecteur de saison (#season-selector), le badge de clôture si `isClosed`, et le script de rechargement par URL.
  ```html
  <div class="flex items-center justify-between print:hidden">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Gestion de la Caisse</h1>
      <p class="text-muted-foreground mt-2">
        Suivi des mouvements d'espèces et transactions physiques de la caisse de l'association.
      </p>
    </div>
    <div class="flex items-center gap-3">
      {isClosed && (
        <span class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
          Saison clôturée (Lecture seule)
        </span>
      )}
      <select
        id="season-selector"
        class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
      >
        {seasonsList.map((s: any) => (
          <option value={s.id} selected={s.id === season}>{s.name}</option>
        ))}
      </select>
    </div>
  </div>
  ```

- [ ] **Step 2: Modifier CashBoxManager.svelte**
  Retirer le conteneur supérieur contenant le sélecteur de saison interne (lignes 178-196) et utiliser `seasonId` passé en prop. Désactiver le bouton d'ajout de transaction si la saison est clôturée.

- [ ] **Step 3: Adapter et vérifier les tests de CashBoxManager**
  Vérifier et ajuster les sélecteurs dans `CashBoxManager.test.ts`.
  Run: `npx vitest run libs/features/accounting/ui/src/CashBoxManager.test.ts`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add apps/admin-console/src/pages/admin/accounting/cash-box.astro libs/features/accounting/ui/src/CashBoxManager.svelte libs/features/accounting/ui/src/CashBoxManager.test.ts
  git commit -m "refactor(accounting): standardize cash box page headers at Astro level"
  ```

---

### Task 2: Standardisation pour les Notes de Frais (expenses/index.astro & ExpensesManager.svelte)

**Files:**
- Modify: `apps/admin-console/src/pages/admin/expenses/index.astro`
- Modify: `libs/features/expenses/ui/src/ExpensesManager.svelte`
- Test: `libs/features/expenses/ui/src/ExpensesManager.test.ts`

- [ ] **Step 1: Mettre à jour expenses/index.astro**
  Ajouter le titre "Notes de Frais", la description, le sélecteur de saison et le badge de clôture.

- [ ] **Step 2: Modifier ExpensesManager.svelte**
  Retirer le sélecteur de saison interne (`selectedSeason` local et son markup), et utiliser directement la prop `seasonId`. Masquer ou désactiver les actions de validation (Approuver, Rejeter, Remettre en attente) si la saison est clôturée (`isClosed`).

- [ ] **Step 3: Adapter et exécuter les tests**
  Ajuster les tests dans `ExpensesManager.test.ts` pour refléter la prop `seasonId`.
  Run: `npx vitest run libs/features/expenses/ui/src/ExpensesManager.test.ts`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add apps/admin-console/src/pages/admin/expenses/index.astro libs/features/expenses/ui/src/ExpensesManager.svelte libs/features/expenses/ui/src/ExpensesManager.test.ts
  git commit -m "refactor(expenses): standardize expenses page headers at Astro level"
  ```

---

### Task 3: Standardisation pour les Soldes Initiaux (config.astro & InitialBalancesConfig.svelte)

**Files:**
- Modify: `apps/admin-console/src/pages/admin/accounting/config.astro`
- Modify: `libs/features/accounting/ui/src/InitialBalancesConfig.svelte`
- Test: `libs/features/accounting/ui/src/InitialBalancesConfig.test.ts`

- [ ] **Step 1: Mettre à jour config.astro**
  Ajouter le sélecteur de saison à droite du titre existant "Soldes initiaux" au niveau Astro.

- [ ] **Step 2: Modifier InitialBalancesConfig.svelte**
  Retirer le champ de formulaire de sélection de saison (`selectedSeasonId` local et l'élément `<select>` correspondant) et consommer directement la prop `seasonId`.

- [ ] **Step 3: Exécuter les tests**
  Run: `npx vitest run libs/features/accounting/ui/src/InitialBalancesConfig.test.ts`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add apps/admin-console/src/pages/admin/accounting/config.astro libs/features/accounting/ui/src/InitialBalancesConfig.svelte libs/features/accounting/ui/src/InitialBalancesConfig.test.ts
  git commit -m "refactor(accounting): standardize initial balances configuration page header"
  ```

---

### Task 4: Standardisation pour les Commandes Boutique (shop/orders.astro & OrdersManager.svelte)

**Files:**
- Modify: `apps/admin-console/src/pages/admin/shop/orders.astro`
- Modify: `libs/features/shop/ui/src/OrdersManager.svelte`
- Test: `libs/features/shop/ui/src/OrdersManager.test.ts`

- [ ] **Step 1: Mettre à jour shop/orders.astro**
  - Prendre en compte le paramètre d'URL `season` et filtrer l'appel API des commandes par saison : `http://localhost/shop/orders?season=${season}`.
  - Ajouter le titre "Commandes Boutique", la description, le sélecteur de saison Astro et le badge de clôture.

- [ ] **Step 2: Modifier OrdersManager.svelte**
  - Retirer le regroupement par saison interne (accordeons par saison), afficher uniquement la liste plate des commandes de la saison sélectionnée.
  - Utiliser la prop `seasonId` pour afficher l'état de la saison et désactiver les boutons de validation (Approuver, Rejeter) si la saison est clôturée.

- [ ] **Step 3: Ajuster et vérifier les tests**
  Adapter `OrdersManager.test.ts` pour refléter la nouvelle structure simplifiée liée à une seule saison.
  Run: `npx vitest run libs/features/shop/ui/src/OrdersManager.test.ts`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add apps/admin-console/src/pages/admin/shop/orders.astro libs/features/shop/ui/src/OrdersManager.svelte libs/features/shop/ui/src/OrdersManager.test.ts
  git commit -m "refactor(shop): standardize shop orders validation page header and filter by season"
  ```

---

### Task 5: Standardisation pour la Gestion des Produits (shop/products.astro & ProductsManager.svelte)

**Files:**
- Modify: `apps/admin-console/src/pages/admin/shop/products.astro`
- Modify: `libs/features/shop/ui/src/ProductsManager.svelte`
- Test: `libs/features/shop/ui/src/ProductsManager.test.ts`

- [ ] **Step 1: Mettre à jour shop/products.astro**
  Ajouter le titre "Gestion des Produits" et sa description au niveau Astro (puisque la page n'est pas liée à une saison).

- [ ] **Step 2: Modifier ProductsManager.svelte**
  Retirer le titre (`h1`) et la description internes du composant.

- [ ] **Step 3: Vérifier les tests**
  Run: `npx vitest run libs/features/shop/ui/src/ProductsManager.test.ts`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add apps/admin-console/src/pages/admin/shop/products.astro libs/features/shop/ui/src/ProductsManager.svelte libs/features/shop/ui/src/ProductsManager.test.ts
  git commit -m "refactor(shop): standardize products page header"
  ```

---

### Task 6: Exécution Finale et Validation Globale

**Files:**
- Test: All tests in the monorepo

- [ ] **Step 1: Exécuter la suite complète Vitest**
  Run: `npx vitest run`
  Expected: PASS

- [ ] **Step 2: Valider avec Astro Check et ESLint**
  Run: `npx astro check --root apps/admin-console`
  Run: `npx eslint .`
  Expected: PASS

- [ ] **Step 3: Finaliser la branche**
  Push all commits to origin/main.
