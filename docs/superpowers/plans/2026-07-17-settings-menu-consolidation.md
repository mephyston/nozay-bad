# Plan d'implémentation - Consolidation du Menu Réglages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les trois entrées distinctes du sous-menu "Réglages" (Saisons, Catégories, Classes) par une seule entrée "Réglages" avec une icône d'écrou (Settings) pointant vers la page `/admin/accounting/settings` car la navigation entre ces écrans est déjà gérée par un système d'onglets interne.

**Architecture:** Modification de l'arborescence de navigation statique dans `AdminLayoutInner.svelte`.

**Tech Stack:** Svelte 5 (Runes), Tailwind CSS v4, `@nba/ui`.

## Global Constraints
- Utiliser l'icône `Settings` existante ou l'importer depuis `lucide-svelte`.
- S'assurer que le bouton reste correctement mis en surbrillance (état actif) peu importe la vue d'onglet sélectionnée.
- Valider la compilation et les tests.

---

### Task 1: Refactoring du Menu de Navigation

**Files:**
- Modify: `apps/admin-console/src/components/AdminLayoutInner.svelte`
- Test: `apps/admin-console/src/components/AdminLayout.test.ts`

- [ ] **Step 1: Importer l'icône Settings**
  Dans [AdminLayoutInner.svelte](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/AdminLayoutInner.svelte), importer `Settings` depuis `lucide-svelte`.

- [ ] **Step 2: Mettre à jour navGroups**
  Remplacer le groupe "Réglages" par un groupe anonyme ou conserver la structure à un seul élément :
  ```typescript
    {
      label: "",
      items: [
        { name: "Réglages", icon: Settings, href: "/admin/accounting/settings" }
      ]
    }
  ```

- [ ] **Step 3: Mettre à jour isItemActive**
  Simplifier la vérification de l'état actif pour les URL contenant `settings` :
  ```typescript
    // Réglages
    if (item.href.includes("settings")) {
      return primary === "réglages" || primary === "settings";
    }
  ```

- [ ] **Step 4: Exécuter les tests unitaires**
  Run: `npx vitest run apps/admin-console/src/components/AdminLayout.test.ts`
  Expected: PASS

- [ ] **Step 5: Valider le typecheck global**
  Run: `npx astro check --root apps/admin-console`
  Expected: PASS

- [ ] **Step 6: Commiter les changements**
  ```bash
  git add apps/admin-console/src/components/AdminLayoutInner.svelte
  git commit -m "refactor(layout): consolidate settings menu items into a single entry with gear icon"
  ```
