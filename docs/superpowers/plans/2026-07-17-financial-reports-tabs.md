# Plan d'Implémentation : Rapports Financiers en Onglets

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer le module en « Rapports financiers », structurer la page de rapports en 3 onglets thématiques distincts (Compte de résultat, Bilan de trésorerie, Budget prévisionnel) et adapter la suite de tests unitaires avec résolution des fuites de mémoire.

**Tech Stack:** Astro, Svelte 5, `@nba/ui` (Tabs, Button, Input, Table, Card).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Renommage et en-tête des Rapports financiers (Astro / Svelte Layout)

**Files:**
* Modify: `apps/admin-console/src/components/AdminLayoutInner.svelte`
* Modify: `apps/admin-console/src/pages/admin/accounting/reports.astro`

**Interfaces:**
* Consumes: Mise en page globale et navigation.
* Produces: Titres uniformes « Rapports financiers ».

- [ ] **Step 1: Update sidebar menu entry in AdminLayoutInner.svelte**

Ouvrir [AdminLayoutInner.svelte](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/AdminLayoutInner.svelte) :
1. Changer le nom du bouton à la ligne ~58 :
   - Remplacer : `name: "Rapports"` par `name: "Rapports financiers"`

- [ ] **Step 2: Update Astro page metadata and title in reports.astro**

Ouvrir [reports.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/reports.astro) :
1. Mettre à jour l'en-tête de page (lignes ~121 à ~130) :
   - Remplacer `<Layout title="Rapports AG - NBA 91">` par `<Layout title="Rapports financiers - NBA 91">`
   - Remplacer `breadcrumb="Comptabilité / Rapports"` par `breadcrumb="Comptabilité / Rapports financiers"`
   - Remplacer `Rapports AG` par `Rapports financiers`
   - Mettre à jour le sous-titre de description : `Consultez les comptes de résultat, le bilan de trésorerie et gérez les budgets prévisionnels.`

- [ ] **Step 3: Run verification checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 4: Commit changes**

```bash
git add apps/admin-console/src/components/AdminLayoutInner.svelte apps/admin-console/src/pages/admin/accounting/reports.astro
git commit -m "style(accounting): rename accounting reports module to Rapports financiers"
```

---

### Task 2: Refonte en onglets dans GeneralMeetingReport.svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/GeneralMeetingReport.svelte`

**Interfaces:**
* Consumes: Primitives `Tabs` de `@nba/ui`.
* Produces: Onglets thématiques pour l'affichage des rapports.

- [ ] **Step 1: Import Tabs and define activeTab state**

Ouvrir [GeneralMeetingReport.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.svelte) :
1. Ajouter `Tabs` dans les imports de `@nba/ui` à la ligne 3.
2. Remplacer la variable `reportMode` par une dérivation réactive basée sur la valeur de l'onglet actif :
   - Déclarer : `let activeTab = $state<'resultat' | 'tresorerie' | 'budget'>('resultat');`
   - Remplacer `reportMode = $state(...)` par un `$derived(activeTab === 'budget' ? 'previsionnel' : 'realise')`

- [ ] **Step 2: Restructure markup into Tabs.Root / Tabs.Content**

Ouvrir [GeneralMeetingReport.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.svelte) :
1. Enlever la barre de titre interne redondante (lignes ~370 à ~385). Conserver uniquement le bouton d'impression en haut ou le déplacer.
2. Ajouter le bloc de navigation d'onglets `<Tabs.Root>` :
   - Onglet 1 : « Compte de résultat » (value="resultat")
   - Onglet 2 : « Bilan de trésorerie » (value="tresorerie")
   - Onglet 3 : « Budget prévisionnel » (value="budget")
3. Placer la table et les graphiques du compte de résultat « Réalisé » dans le premier onglet.
4. Placer le tableau du bilan de trésorerie dans le deuxième onglet.
5. Placer la table du budget éditable, le formulaire de sauvegarde et les graphiques correspondants dans le troisième onglet.
6. Mettre à jour les styles d'impression pour forcer l'affichage de l'ensemble des onglets (`display: block !important` sur les contenus dans `@media print`).

- [ ] **Step 3: Run Astro check**

* Run: `npx astro check --root apps/admin-console`
* Expected: PASS (0 erreurs de compilation).

- [ ] **Step 4: Commit changes**

```bash
git add libs/features/accounting/ui/src/GeneralMeetingReport.svelte
git commit -m "feat(accounting): restructure financial reports view into theme tabs"
```

---

### Task 3: Refonte de la suite de tests unitaires et résolution des fuites

**Files:**
* Modify: `libs/features/accounting/ui/src/GeneralMeetingReport.test.ts`

**Interfaces:**
* Consumes: Méthodes de nettoyage Vitest/Svelte.
* Produces: Tests unitaires de rapports financiers fiables sans fuites.

- [ ] **Step 1: Implement component unmounting in test file**

Ouvrir [GeneralMeetingReport.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.test.ts) :
1. Importer `unmount` depuis `'svelte'` à la ligne 2.
2. Déclarer la variable `let component: any = null;` sous `describe` (ligne ~5).
3. Assigner `component = mount(...)` pour chaque montage (3 occurrences).
4. Créer un hook `afterEach` pour détruire proprement le composant et effacer `document.body.innerHTML` :
   ```typescript
     afterEach(() => {
       if (component) {
         unmount(component);
         component = null;
       }
       document.body.innerHTML = '';
     });
   ```

- [ ] **Step 2: Update click assertion to select the Budget tab**

Ouvrir [GeneralMeetingReport.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.test.ts) :
1. À la ligne ~139, le test recherche le bouton d'onglet pour changer de mode :
   - Remplacer le clic sur le bouton "Prévisionnel" par la sélection de l'onglet « Budget prévisionnel » (qui porte l'identifiant ou le texte « Budget prévisionnel »).
   - Simuler le clic :
     ```typescript
     const prevTab = Array.from(target.querySelectorAll('button')).find(btn => btn.textContent?.includes('Budget prévisionnel'));
     expect(prevTab).toBeDefined();
     prevTab?.click();
     flushSync();
     ```

- [ ] **Step 3: Run tests and verify**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/GeneralMeetingReport.test.ts`
* Run full Vitest suite: `npx vitest run`
* Expected: PASS (tous les tests passent).

- [ ] **Step 4: Commit changes**

```bash
git add libs/features/accounting/ui/src/GeneralMeetingReport.test.ts
git commit -m "test(accounting): fix financial reports tests and clean memory leaks via unmount"
```
