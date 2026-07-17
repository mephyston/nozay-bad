# Plan d'Implémentation : Uniformisation des Boutons d'Importation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre homogène la présentation visuelle, l'icône standardisée et le libellé des boutons d'importation des pages Adhérents et Rapprochement Bancaire.

**Tech Stack:** Astro, Tailwind CSS, SVG.

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Bouton « Import Poona » avec icône dans index.astro (Adhérents)

**Files:**
* Modify: `apps/admin-console/src/pages/admin/members/index.astro`

**Interfaces:**
* Consumes: Mise en page Astro des adhérents.
* Produces: Bouton avec icône et libellé « Import Poona ».

- [ ] **Step 1: Update button markup with icon and new label**

Ouvrir [index.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/members/index.astro) :
1. Remplacer le lien d'importation existant (lignes ~49 à ~54) :
   - Remplacer :
     ```html
     <a
       href="/admin/members/import"
       class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90"
     >
       Importer
     </a>
     ```
   - Par :
     ```html
     <a
       href="/admin/members/import"
       class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-2 border-0 no-underline"
     >
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
       Import Poona
     </a>
     ```

- [ ] **Step 2: Commit changes**

```bash
git add apps/admin-console/src/pages/admin/members/index.astro
git commit -m "style(members): standardise import button with icon and Import Poona label"
```

---

### Task 2: Bouton « Importer un relevé bancaire » dans import.astro (Rapprochement)

**Files:**
* Modify: `apps/admin-console/src/pages/admin/accounting/import.astro`

**Interfaces:**
* Consumes: Mise en page Astro du rapprochement.
* Produces: Bouton avec libellé « Importer un relevé bancaire ».

- [ ] **Step 1: Update button label in import.astro**

Ouvrir [import.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/import.astro) :
1. Changer le texte du bouton de `'Importer'` à `'Importer un relevé bancaire'` (ligne ~159) :
   - Remplacer :
     ```html
             {!isClosed && bankTransactionsList.length > 0 && (
               <button
                 id="trigger-import-btn"
                 onclick="window.dispatchEvent(new CustomEvent('open-bank-import'))"
                 class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-2 border-0"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                 Importer
               </button>
             )}
     ```
   - Par :
     ```html
             {!isClosed && bankTransactionsList.length > 0 && (
               <button
                 id="trigger-import-btn"
                 onclick="window.dispatchEvent(new CustomEvent('open-bank-import'))"
                 class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-2 border-0"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                 Importer un relevé bancaire
               </button>
             )}
     ```

- [ ] **Step 2: Run verification checks**

* Run Vitest tests: `npx vitest run`
* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add apps/admin-console/src/pages/admin/accounting/import.astro
git commit -m "style(accounting): update reconciliation import button label to Importer un relevé bancaire"
```
