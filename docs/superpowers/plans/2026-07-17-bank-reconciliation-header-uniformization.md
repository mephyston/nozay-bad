# Plan d'Implémentation : Alignement de l'En-tête & Icône d'Importation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déplacer l'en-tête de page (titre + description) et aligner le bouton « Importer » à droite dans le composant Svelte pour refléter le design uniforme de la console d'administration.

**Tech Stack:** Astro, Svelte 5, `@metacult/shared-ui` (Button, Badge).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Retrait de l'en-tête Astro dans import.astro

**Files:**
* Modify: `apps/admin-console/src/pages/admin/accounting/import.astro`

**Interfaces:**
* Consumes: Mise en page Astro.
* Produces: Page Astro épurée déléguant le titre au composant de contenu.

- [ ] **Step 1: Remove page title block in import.astro**

Ouvrir [import.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/import.astro) :
1. Supprimer le bloc d'en-tête (lignes ~139 à ~148) :
   ```html
         <div class="flex items-center justify-between">
           <div>
             <h1 class="text-3xl font-bold tracking-tight">Rapprochement bancaire</h1>
             <p class="text-muted-foreground mt-2">
               Rapprochez les relevés bancaires importés avec les écritures du grand livre et valisez les factures.
             </p>
           </div>
         </div>
   ```

- [ ] **Step 2: Commit changes**

```bash
git add apps/admin-console/src/pages/admin/accounting/import.astro
git commit -m "style(accounting): delegate reconciliation page title layout from astro page to svelte component"
```

---

### Task 2: Refonte de l'en-tête et du bouton d'importation dans le composant Svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.svelte`

**Interfaces:**
* Consumes: Primitives Svelte de présentation.
* Produces: En-tête flex avec bouton d'importation primaire à droite du titre.

- [ ] **Step 1: Implement uniform header layout with button in Svelte**

Ouvrir [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.svelte) :
1. Remplacer la barre d'importation et d'information de clôture au début du balisage (lignes ~981 à ~1002) :
   - Remplacer :
     ```html
       {#if isClosed || (bankTransactions.length > 0 && !isClosed)}
         <div class="flex items-center justify-between">
           <div class="flex items-center gap-3">
             {#if isClosed}
               <Badge variant="outline" class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
                 Saison clôturée (Lecture seule)
               </Badge>
             {/if}
           </div>
           {#if bankTransactions.length > 0 && !isClosed}
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
   - Par :
     ```html
       <div class="flex items-center justify-between">
         <div>
           <h1 class="text-3xl font-bold tracking-tight text-foreground">Rapprochement bancaire</h1>
           <p class="text-muted-foreground mt-2">
             Rapprochez les relevés bancaires importés avec les écritures du grand livre et validez les factures.
           </p>
         </div>
         <div class="flex items-center gap-3 shrink-0">
           {#if isClosed}
             <Badge variant="outline" class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
               Saison clôturée (Lecture seule)
             </Badge>
           {/if}
           {#if bankTransactions.length > 0 && !isClosed}
             <Button 
               type="button"
               onclick={() => showImportModal = true}
               class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer border-0"
             >
               <Upload class="h-4 w-4" />
               <span>Importer</span>
             </Button>
           {/if}
         </div>
       </div>
     ```

- [ ] **Step 2: Run verification checks**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`
* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/BankStatementReconciliation.svelte
git commit -m "feat(accounting): style and align import button with unified page title in bank reconciliation"
```
