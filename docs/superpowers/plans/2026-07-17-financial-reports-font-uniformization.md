# Plan d'Implémentation : Rapports Financiers - Uniformisation Polices & Nettoyage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uniformiser les polices des rapports financiers en supprimant la police monospace `font-mono` pour utiliser la police Outfit, et nettoyer les imports et codes morts du composant Svelte.

**Tech Stack:** Svelte 5, Tailwind CSS.

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Uniformisation des polices (suppression de font-mono) dans GeneralMeetingReport.svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/GeneralMeetingReport.svelte`

**Interfaces:**
* Consumes: Mise en page CSS.
* Produces: Affichage des montants numériques avec la police Outfit sans-serif.

- [ ] **Step 1: Remove font-mono classes in amount cell containers**

Ouvrir [GeneralMeetingReport.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.svelte) :
1. Retirer la classe `font-mono` de tous les conteneurs de chiffres (environ 12 occurrences) dans les fonctions de rendering et les tableaux de recettes/dépenses :
   - Remplacer les classes contenant `font-mono` par des classes équivalentes sans `font-mono` (par exemple `flex gap-8 font-mono text-[11px]` devient `flex gap-8 text-[11px]`).
2. Remplacer `<strong class="font-mono">` par `<strong class="font-semibold">` dans les pourcentages des légendes des graphiques (charges et produits).

- [ ] **Step 2: Run verification checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/GeneralMeetingReport.svelte
git commit -m "style(accounting): remove font-mono and uniformise financial report numbers with Outfit font"
```

---

### Task 2: Nettoyage du code mort dans GeneralMeetingReport.svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/GeneralMeetingReport.svelte`

**Interfaces:**
* Consumes: Variables et imports internes du composant.
* Produces: Code source allégé et propre sans lints.

- [ ] **Step 1: Remove unused imports and helper function**

Ouvrir [GeneralMeetingReport.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.svelte) :
1. Retirer `Printer` et `AlertCircle` de la ligne 2 :
   - Remplacer `import { AlertCircle, Printer } from 'lucide-svelte';` par `import { } from 'lucide-svelte';` (ou supprimer l'import s'il est vide).
2. Retirer la fonction obsolète `applySeasonChange()` (lignes ~341 à ~345).

- [ ] **Step 2: Remove unused reactive states and variables**

Ouvrir [GeneralMeetingReport.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.svelte) :
1. Retirer la fonction `getClassSum` (vers la ligne ~119).
2. Retirer les variables dérivées non utilisées :
   - `totalDepensesRealise`
   - `totalRecettesRealise`
   - `netResultRealise`
   - `netResultPrevisionnel`
   - `totalDepenses`
   - `totalRecettes`
   - `netResult`

- [ ] **Step 3: Run full verification suite**

* Run: `npx astro check --root apps/admin-console`
* Run: `npx vitest run`
* Expected: PASS (0 erreurs de compilation, tous les tests passent).

- [ ] **Step 4: Commit changes**

```bash
git add libs/features/accounting/ui/src/GeneralMeetingReport.svelte
git commit -m "refactor(accounting): clean up unused imports and dead code in reports component"
```
