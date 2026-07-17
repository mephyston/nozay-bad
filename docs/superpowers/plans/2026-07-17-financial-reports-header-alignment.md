# Plan d'Implémentation : Rapports Financiers - Alignement En-tête

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déplacer le sélecteur de saison et le bouton d'impression au niveau d'Astro dans l'en-tête de la page des rapports financiers, et nettoyer le composant Svelte correspondant.

**Tech Stack:** Astro, Svelte 5, Tailwind CSS, SVG.

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Ajout du sélecteur de saison et du bouton d'impression dans reports.astro

**Files:**
* Modify: `apps/admin-console/src/pages/admin/accounting/reports.astro`

**Interfaces:**
* Consumes: Paramètres de saison en Query Parameter.
* Produces: Sélecteur et bouton d'impression dans l'en-tête Astro avec comportement JS de rechargement.

- [ ] **Step 1: Update page header and add client script in reports.astro**

Ouvrir [reports.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/reports.astro) :
1. Mettre à jour l'en-tête (lignes ~123 à ~131) pour inclure le sélecteur et le bouton d'impression :
   - Remplacer :
     ```html
           <div class="flex items-center justify-between">
             <div>
               <h1 class="text-3xl font-bold tracking-tight">Rapports financiers</h1>
               <p class="text-muted-foreground mt-2">
                 Consultez les comptes de résultat, le bilan de trésorerie et gérez les budgets prévisionnels.
               </p>
             </div>
           </div>
     ```
   - Par :
     ```html
           <div class="flex items-center justify-between no-print">
             <div>
               <h1 class="text-3xl font-bold tracking-tight">Rapports financiers</h1>
               <p class="text-muted-foreground mt-2">
                 Consultez les comptes de résultat, le bilan de trésorerie et gérez les budgets prévisionnels.
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

               <button
                 id="print-btn"
                 onclick="window.print()"
                 class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-1.5 border-0 h-9"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                 Imprimer
               </button>
             </div>
           </div>
     ```
2. Ajouter le bloc `<script>` en bas du fichier (avant la fermeture du `Layout` ou du code HTML) :
   ```html
   <script>
     const selector = document.getElementById('season-selector');
     if (selector) {
       selector.addEventListener('change', (e) => {
         const newSeason = (e.target as HTMLSelectElement).value;
         const params = new URLSearchParams(window.location.search);
         params.set('season', newSeason);
         window.location.href = `/admin/accounting/reports?${params.toString()}`;
       });
     }
   </script>
   ```

- [ ] **Step 2: Run verification checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add apps/admin-console/src/pages/admin/accounting/reports.astro
git commit -m "style(accounting): move season selector and print button to Astro header in reports page"
```

---

### Task 2: Suppression de la barre d'action supérieure dans GeneralMeetingReport.svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/GeneralMeetingReport.svelte`

**Interfaces:**
* Consumes: Structure interne Svelte.
* Produces: Vue épurée démarrant directement sur les onglets.

- [ ] **Step 1: Delete top bar container from Svelte template**

Ouvrir [GeneralMeetingReport.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/GeneralMeetingReport.svelte) :
1. Repérer et enlever les lignes ~396 à ~406 (le conteneur `<div class="flex justify-end items-center gap-3 no-print">` et son contenu).
2. Vérifier que le composant démarre directement avec le `<Tabs.Root>`.

- [ ] **Step 2: Run verification checks**

* Run Astro check: `npx astro check --root apps/admin-console`
* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/GeneralMeetingReport.test.ts`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/GeneralMeetingReport.svelte
git commit -m "style(accounting): remove top action bar from reports Svelte component"
```
