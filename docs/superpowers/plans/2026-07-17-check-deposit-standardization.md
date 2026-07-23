# Plan d'Implémentation : Standardisation de la Remise de Chèques

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déplacer l'en-tête et le sélecteur de saison au niveau d'Astro, migrer les onglets et les checkboxes vers les composants accessibles standards, uniformiser les polices avec Outfit et résoudre les fuites de mémoire de test.

**Tech Stack:** Astro, Svelte 5, Tailwind CSS, `@nba/ui` (Tabs, Checkbox, Button, Card, Table, Dialog, Alert).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: En-tête de page Astro et sélecteur de saison (`cheques.astro`)

**Files:**
* Modify: `apps/admin-console/src/pages/admin/accounting/cheques.astro`

**Interfaces:**
* Consumes: Paramètres de saison.
* Produces: En-tête Astro avec titre, description, sélecteur de saison et script client.

- [ ] **Step 1: Update page header in cheques.astro**

Ouvrir [cheques.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/cheques.astro) :
1. Remplacer le bloc d'en-tête (lignes ~133 à ~140) par la version alignée :
   ```html
     <AdminLayout client:load email={userEmail} breadcrumb="Comptabilité / Remises de chèques">
       <div class="space-y-6">
         <div class="flex items-center justify-between print:hidden">
           <div>
             <h1 class="text-3xl font-bold tracking-tight">Remise de chèques</h1>
             <p class="text-muted-foreground mt-2">
               Gestion et suivi des chèques physiques, génération de bordereaux de remise et rapprochement bancaire.
             </p>
           </div>
           <div class="flex items-center gap-3">
             <select
               id="season-selector"
               class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
             >
               {seasonsList.map((s: any) => (
                 <option value={s.id} selected={s.id === season}>{s.name}</option>
               ))}
               {seasonsList.length === 0 && (
                 <option value="25-26" selected>Saison 2025-2026</option>
               )}
             </select>
           </div>
         </div>
   ```

- [ ] **Step 2: Add client script block**

Ouvrir [cheques.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/cheques.astro) :
1. Ajouter le script client en bas du fichier (avant la balise fermante `</Layout>`) :
   ```html
   <script>
     const selector = document.getElementById('season-selector');
     if (selector) {
       selector.addEventListener('change', (e) => {
         const newSeason = (e.target as HTMLSelectElement).value;
         const params = new URLSearchParams(window.location.search);
         params.set('season', newSeason);
         window.location.href = `/admin/accounting/cheques?${params.toString()}`;
       });
     }
   </script>
   ```

- [ ] **Step 3: Run Astro checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 4: Commit changes**

```bash
git add apps/admin-console/src/pages/admin/accounting/cheques.astro
git commit -m "style(accounting): move page title and season selector to Astro header in cheques page"
```

---

### Task 2: Nettoyage de l'en-tête Svelte et variables associées

**Files:**
* Modify: `libs/features/accounting/ui/src/CheckDepositManager.svelte`

**Interfaces:**
* Consumes: Paramètres et variables du composant Svelte.
* Produces: Vue épurée sans double en-tête.

- [ ] **Step 1: Remove top action card container**

Ouvrir [CheckDepositManager.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.svelte) :
1. Retirer le bloc `<Card.Root>` supérieur (lignes ~428 à ~460).
2. Vérifier que le composant démarre directement avec les contrôles d'onglets.

- [ ] **Step 2: Run verification checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/CheckDepositManager.svelte
git commit -m "style(accounting): remove top header card from CheckDepositManager Svelte component"
```

---

### Task 3: Migration vers les onglets standards de shared-ui

**Files:**
* Modify: `libs/features/accounting/ui/src/CheckDepositManager.svelte`

**Interfaces:**
* Consumes: Primitives `Tabs` de `@nba/ui`.
* Produces: Onglets thématiques pour l'affichage de la remise de chèques.

- [ ] **Step 1: Import Tabs and refactor layout**

Ouvrir [CheckDepositManager.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.svelte) :
1. Ajouter `Tabs` dans les imports de `@nba/ui` à la ligne 3.
2. Remplacer les boutons d'onglets personnalisés (lignes ~463 à ~480) par `<Tabs.Root bind:value={activeTab}>`, `<Tabs.List>` et `<Tabs.Trigger>`.
3. Envelopper les contenus correspondants dans des blocs `<Tabs.Content value="checks">` et `<Tabs.Content value="deposits">`.
4. S'assurer que les boutons dynamiques (d'enregistrement de chèque et de remise) se trouvent à l'intérieur de l'en-tête de l'onglet ou juste à côté pour rester réactifs.

- [ ] **Step 2: Run verification checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/CheckDepositManager.svelte
git commit -m "feat(accounting): migrate CheckDepositManager layout to standard Tabs component"
```

---

### Task 4: Standardisation des checkboxes et polices de caractères (Outfit)

**Files:**
* Modify: `libs/features/accounting/ui/src/CheckDepositManager.svelte`

**Interfaces:**
* Consumes: Primitives `Checkbox` de `@nba/ui`.
* Produces: Checkboxes accessibles et montants en Outfit sans-serif.

- [ ] **Step 1: Migrate raw checkboxes to Checkbox component**

Ouvrir [CheckDepositManager.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.svelte) :
1. Importer `Checkbox` depuis `@nba/ui` à la ligne 3.
2. Remplacer la checkbox de sélection générale du tableau (lignes ~524 à ~533) par le composant `<Checkbox>` avec propriété `checked` et callback `onCheckedChange`.
3. Remplacer les checkboxes individuelles de chaque ligne (lignes ~548 à ~553) par `<Checkbox>` avec liaison `checked` bidirectionnelle ou `onCheckedChange`.

- [ ] **Step 2: Remove font-mono class usages**

Ouvrir [CheckDepositManager.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.svelte) :
1. Retirer la classe `font-mono` sur l'ensemble des numéros de chèques, codes, inputs de formulaire et affichages dans les modales (lignes ~558, ~644, ~812, ~1017, ~1066, ~1132, ~1169).
2. S'assurer que tous les nombres et montants utilisent la police standard du projet (**Outfit**).

- [ ] **Step 3: Run verification checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 4: Commit changes**

```bash
git add libs/features/accounting/ui/src/CheckDepositManager.svelte
git commit -m "style(accounting): standardise checkboxes and uniformise numbers with Outfit font in CheckDepositManager"
```

---

### Task 5: Résolution des fuites de mémoire dans les tests unitaires

**Files:**
* Modify: `libs/features/accounting/ui/src/CheckDepositManager.test.ts`

**Interfaces:**
* Consumes: Méthodes de nettoyage Vitest/Svelte.
* Produces: Tests fiables de remise de chèques sans fuite de mémoire.

- [ ] **Step 1: Implement component unmounting in test suite**

Ouvrir [CheckDepositManager.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.test.ts) :
1. Importer `unmount` depuis `'svelte'` à la ligne 2.
2. Déclarer la variable globale de test `let component: any = null;` au début de `describe`.
3. Assigner le retour de chaque appel `mount(...)` à cette variable `component = mount(...)` (2 occurrences).
4. Ajouter le hook `afterEach` pour appeler `unmount(component)` et réinitialiser `document.body.innerHTML = ''`.
5. Mettre à jour les sélecteurs de checkbox pour cibler `[role="checkbox"]` au lieu des sélecteurs d'input checkbox classiques.

- [ ] **Step 2: Run verification checks**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/CheckDepositManager.test.ts`
* Run full Vitest suite: `npx vitest run`
* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/CheckDepositManager.test.ts
git commit -m "test(accounting): resolve memory leaks in CheckDepositManager tests via unmount"
```
