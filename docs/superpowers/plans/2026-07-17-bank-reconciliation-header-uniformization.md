# Plan d'Implémentation : Alignement de l'En-tête & Icône d'Importation (Astro Level)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Placer l'en-tête de page (titre + description) et aligner le bouton « Importer » au niveau d'Astro, en connectant le bouton à la modale Svelte par un événement personnalisé.

**Tech Stack:** Astro, Svelte 5, Tailwind CSS.

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: En-tête de page et bouton d'importation dans import.astro

**Files:**
* Modify: `apps/admin-console/src/pages/admin/accounting/import.astro`

**Interfaces:**
* Consumes: Mise en page Astro.
* Produces: Titre de page et bouton primaire d'importation avec déclencheur CustomEvent.

- [ ] **Step 1: Compute isClosed and render header block with button**

Ouvrir [import.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/import.astro) :
1. Calculer `isClosed` dans le frontmatter (lignes ~99) :
   ```typescript
   const isClosed = seasonsList.find(s => s.id === season)?.status === 'closed';
   ```
2. Remplacer le bloc d'en-tête existant (lignes ~139 à ~148) par la version alignée avec le bouton :
   ```html
         <div class="flex items-center justify-between">
           <div>
             <h1 class="text-3xl font-bold tracking-tight">Rapprochement bancaire</h1>
             <p class="text-muted-foreground mt-2">
               Rapprochez les relevés bancaires importés avec les écritures du grand livre et validez les factures.
             </p>
           </div>
           <div class="flex items-center gap-3 shrink-0">
             {isClosed && (
               <span class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
                 Saison clôturée (Lecture seule)
               </span>
             )}
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
           </div>
         </div>
   ```

- [ ] **Step 2: Commit changes**

```bash
git add apps/admin-console/src/pages/admin/accounting/import.astro
git commit -m "style(accounting): implement page header and import button at Astro level on reconciliation page"
```

---

### Task 2: Écoute de l'événement et nettoyage UI dans le composant Svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.svelte`

**Interfaces:**
* Consumes: Événement personnalisé `'open-bank-import'` de `window`.
* Produces: Ouverture réactive de la modale d'importation sans boutons redondants.

- [ ] **Step 1: Listen to open-bank-import event onMount**

Ouvrir [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.svelte) :
1. Importer `onMount` depuis `'svelte'` (à la ligne 1).
2. Ajouter le bloc `onMount` pour écouter `'open-bank-import'` (lignes ~95) :
   ```typescript
     onMount(() => {
       const handleOpen = () => {
         if (!isClosed) {
           showImportModal = true;
         }
       };
       window.addEventListener('open-bank-import', handleOpen);
       return () => {
         window.removeEventListener('open-bank-import', handleOpen);
       };
     });
   ```

- [ ] **Step 2: Remove local import button block in HTML template**

Ouvrir [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.svelte) :
1. Supprimer l'ancien bloc bouton/badge en haut (lignes ~982 à ~1002) :
   ```html
     {#if isClosed || (bankStatementLines.length > 0 && !isClosed)}
       <div class="flex items-center justify-between">
         <div class="flex items-center gap-3">
           {#if isClosed}
             <Badge variant="outline" class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
               Saison clôturée (Lecture seule)
             </Badge>
           {/if}
         </div>
         {#if bankStatementLines.length > 0 && !isClosed}
           <Button 
             type="button"
             onclick={() => showImportModal = true}
             class="inline-flex items-center gap-1.5 text-xs font-semibold"
           >
             <Upload class="w-3.5 h-3.5" />
             Importer un relevé (.ofx)
           </Button>
         {/if}
       </div>
     {/if}
   ```

- [ ] **Step 3: Run verification checks**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`
* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 4: Commit changes**

```bash
git add libs/features/accounting/ui/src/BankStatementReconciliation.svelte
git commit -m "feat(accounting): handle open-bank-import window event and clean up local import button in svelte"
```

---

### Task 3: Résolution des fuites de mémoire (unmount) dans les tests

**Files:**
* Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`

**Interfaces:**
* Consumes: Méthodes de nettoyage Vitest/Svelte.
* Produces: Une suite de tests propre sans fuite d'écouteurs d'événements.

- [ ] **Step 1: Track and unmount component instances in test file**

Ouvrir [BankStatementReconciliation.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.test.ts) :
1. Importer `unmount` depuis `'svelte'` à la ligne 2.
2. Déclarer la variable `let component: any = null;` sous `describe` (ligne ~7).
3. Assigner `component = mount(...)` pour chaque appel de montage (12 occurrences).
4. Ajouter le nettoyage dans le hook `afterEach` :
   ```typescript
     afterEach(() => {
       if (component) {
         unmount(component);
         component = null;
       }
       document.body.innerHTML = '';
       ...
     });
   ```

- [ ] **Step 2: Run verification checks**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/BankStatementReconciliation.test.ts
git commit -m "test(accounting): resolve memory leaks by unmounting svelte components in afterEach hook"
```
