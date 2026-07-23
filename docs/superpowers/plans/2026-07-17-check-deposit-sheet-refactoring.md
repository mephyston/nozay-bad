# Plan d'Implémentation : Panel Latéral (Sheet) de Création de Chèques

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la boîte de dialogue modale classique (`Dialog`) par un volet coulissant latéral droit (`Sheet`) pour l'enregistrement d'un chèque physique dans `CheckDepositManager.svelte`.

**Tech Stack:** Svelte 5, Tailwind CSS, `@nba/ui` (Sheet, Button, Input, Dialog, Card, Table).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Refactorisation du Dialog en Sheet dans CheckDepositManager.svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/CheckDepositManager.svelte`

**Interfaces:**
* Consumes: Primitives `Sheet` de `@nba/ui`.
* Produces: Panel latéral coulissant droit de saisie/OCR chèque.

- [ ] **Step 1: Import Sheet from shared-ui**

Ouvrir [CheckDepositManager.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.svelte) :
1. Ajouter `Sheet` dans les imports de `@nba/ui` à la ligne 3.

- [ ] **Step 2: Replace Dialog markup with Sheet markup**

Ouvrir [CheckDepositManager.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.svelte) :
1. Remplacer `<Dialog.Root bind:open={showAddCheckModal}>` par `<Sheet.Root bind:open={showAddCheckModal}>` (ligne ~700).
2. Remplacer `<Dialog.Content class="w-full max-w-lg p-0 bg-card border-border overflow-hidden">` par `<Sheet.Content class="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-border overflow-hidden">` (ligne ~701).
3. Remplacer `<Dialog.Header ...>` par `<Sheet.Header ...>`.
4. Remplacer `<Dialog.Title ...>` par `<Sheet.Title ...>`.
5. Remplacer `<Dialog.Description ...>` par `<Sheet.Description ...>`.
6. Remplacer la div du corps du formulaire pour utiliser toute la hauteur avec scroll vertical :
   Remplacer `<div class="p-6 overflow-y-auto max-h-[70vh] space-y-4">` par `<div class="p-6 overflow-y-auto flex-grow space-y-4">` (ligne ~707).
7. Remplacer `<Dialog.Footer ...>` par `<Sheet.Footer class="p-6 border-t border-border bg-muted/30 flex justify-end gap-2 shrink-0">` (ligne ~923).
8. Remplacer les boutons de fermeture associés (par exemple `onclick={() => showAddCheckModal = false}`) en gardant le même comportement.
9. Remplacer les balises fermantes associées (`</Dialog.Footer>`, `</Dialog.Header>`, `</Dialog.Content>`, `</Dialog.Root>`) par les balises `Sheet` équivalentes (`</Sheet.Footer>`, `</Sheet.Header>`, `</Sheet.Content>`, `</Sheet.Root>`).

- [ ] **Step 3: Run Astro checks**

* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 4: Commit changes**

```bash
git add libs/features/accounting/ui/src/CheckDepositManager.svelte
git commit -m "feat(accounting): replace check creation Dialog modal with Sheet side panel"
```

---

### Task 2: Mise à jour et validation des tests unitaires

**Files:**
* Modify: `libs/features/accounting/ui/src/CheckDepositManager.test.ts`

**Interfaces:**
* Consumes: Sélecteurs de test et hooks de nettoyage.
* Produces: Suite de tests au vert avec validation du panel latéral.

- [ ] **Step 1: Update testing assertions and selectors**

Ouvrir [CheckDepositManager.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/CheckDepositManager.test.ts) :
1. Mettre à jour les sélecteurs de test si nécessaire pour cibler les composants `Sheet` au lieu de `Dialog` (par exemple, s'assurer que le bouton d'ouverture ouvre bien le panel et que les inputs du formulaire sont accessibles dans le document).

- [ ] **Step 2: Run verification checks**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/CheckDepositManager.test.ts`
* Run full Vitest suite: `npx vitest run`
* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/CheckDepositManager.test.ts
git commit -m "test(accounting): update CheckDepositManager unit tests for Sheet integration"
```
