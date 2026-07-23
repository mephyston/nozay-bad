# Plan d'implémentation - Migration des Composants de la Boutique vers Shadcn-Svelte

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer les composants de l'application Boutique (`ExpenseReportForm.svelte` et `ShopCatalog.svelte`) pour consommer les primitives standardisées de `@nba/ui` (Card, Input, Button, Badge, Label) au lieu des éléments HTML bruts et styles personnalisés.

**Architecture:** Approche modulaire composant par composant. Nous remplaçons les structures HTML de présentation et de saisie par les composants importés de `@nba/ui` tout en préservant à 100% l'état réactif Svelte 5, les événements, et la logique de validation.

**Tech Stack:** Svelte 5 (Runes), Tailwind CSS v4, Vitest, `@nba/ui`.

## Global Constraints
- Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
- Conserver l'intégralité des fonctionnalités métiers (Runes Svelte 5, requêtes réseau fetch, interactions clavier du menu déroulant et validation anti-bot Turnstile).
- Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
- Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
- Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Migration de ExpenseReportForm.svelte

**Files:**
- Modify: `apps/boutique/src/components/ExpenseReportForm.svelte`
- Test: `apps/boutique/src/components/ExpenseReportForm.test.ts`

**Interfaces:**
- Consumes: `Button`, `Input`, `Badge`, `Card`, `Label` de `@nba/ui`
- Produces: Formulaire de note de frais standardisé

- [ ] **Step 1: Inspecter et préparer le fichier de tests**
  Consulter [ExpenseReportForm.test.ts](file:///Users/david/Lab/nozay-bad/apps/boutique/src/components/ExpenseReportForm.test.ts) pour identifier les sélecteurs DOM actuels.
  Ajouter un test unitaire validant l'utilisation des composants de `@nba/ui` (par exemple, la présence de classes spécifiques à Card ou Input dans le rendu HTML).
  S'assurer que `beforeEach`/`afterEach` gèrent correctement les timers virtuels avec `vi.useFakeTimers()` et `vi.runAllTimers()` pour éviter les fuites de timers asynchrones de bits-ui.

- [ ] **Step 2: Importer les composants de design system**
  Ajouter les imports en haut du script de `ExpenseReportForm.svelte` :
  ```typescript
  import { Button, Card, Input, Label, Badge } from '@nba/ui';
  ```

- [ ] **Step 3: Refactoriser le markup du formulaire**
  - Remplacer le conteneur principal `div` (ligne 259) par `<Card.Root>`.
  - Mettre en forme le header dégradé à l'aide de `<Card.Header>` et `<Card.Title>`.
  - Remplacer les labels de formulaire par le composant `<Label>`.
  - Remplacer l'élément `<input>` de recherche de membre (combobox) et l'input numérique de montant par le composant `<Input>`.
  - Conserver la liste déroulante absolute `expense-member-listbox` mais appliquer des classes d'état de survol cohérentes avec Shadcn.
  - Remplacer le bouton de soumission final par `<Button type="submit" disabled={submitting} class="...">`.

- [ ] **Step 4: Exécuter la suite de tests unitaires**
  Run: `npx vitest run apps/boutique/src/components/ExpenseReportForm.test.ts`
  Expected: PASS

- [ ] **Step 5: Valider le typecheck global**
  Run: `npx astro check --root apps/admin-console`
  Expected: PASS

- [ ] **Step 6: Commiter les modifications**
  ```bash
  git add apps/boutique/src/components/ExpenseReportForm.svelte apps/boutique/src/components/ExpenseReportForm.test.ts
  git commit -m "style(boutique): migrate expense report form to shadcn components"
  ```

---

### Task 2: Migration de ShopCatalog.svelte

**Files:**
- Modify: `apps/boutique/src/components/ShopCatalog.svelte`
- Test: `apps/boutique/src/components/ShopCatalog.test.ts`

**Interfaces:**
- Consumes: `Button`, `Input`, `Badge`, `Card`, `Label` de `@nba/ui`
- Produces: Catalogue de commande de boutique standardisé

- [ ] **Step 1: Préparer le fichier de tests**
  Consulter [ShopCatalog.test.ts](file:///Users/david/Lab/nozay-bad/apps/boutique/src/components/ShopCatalog.test.ts) pour s'aligner sur les sélecteurs DOM.
  Ajouter un test s'assurant du rendu correct des composants Card pour les produits et de la combobox d'adhérent.
  Activer les fake timers `vi.useFakeTimers()` dans les hooks de tests si requis pour le teardown asynchrone de bits-ui.

- [ ] **Step 2: Importer les composants de design system**
  Ajouter les imports en haut du script de `ShopCatalog.svelte` :
  ```typescript
  import { Button, Card, Input, Label, Badge } from '@nba/ui';
  ```

- [ ] **Step 3: Refactoriser le sélecteur d'adhérent et le catalogue**
  - Remplacer le bloc supérieur de sélection d'adhérent pour utiliser les composants `<Label>` et `<Input>` de recherche.
  - Pour chaque produit de la grille, remplacer la carte HTML brute par :
    ```svelte
    <Card.Root class="...">
      <Card.Header>
        <div class="flex justify-between items-start gap-2">
          <Card.Title>{product.name}</Card.Title>
          <Badge variant={product.stock > 0 ? "outline" : "destructive"}>
            {product.stock > 0 ? `Stock: ${product.stock}` : "Rupture"}
          </Badge>
        </div>
      </Card.Header>
      <Card.Content class="flex-grow">
        <!-- Affichage du prix et descriptions -->
      </Card.Content>
      <Card.Footer>
        <!-- Formulaire de sélection de quantité et de paiement avec Input, Label et Button -->
      </Card.Footer>
    </Card.Root>
    ```

- [ ] **Step 4: Exécuter la suite complète de tests**
  Run: `npx vitest run`
  Expected: PASS (Toutes les suites passent sans erreur ni fuite de timers)

- [ ] **Step 5: Lancer les vérifications de type et de lint**
  Run: `npx astro check --root apps/admin-console`
  Run: `npx eslint .`
  Expected: PASS (0 erreur)

- [ ] **Step 6: Commiter et pousser les modifications**
  ```bash
  git add apps/boutique/src/components/ShopCatalog.svelte apps/boutique/src/components/ShopCatalog.test.ts
  git commit -m "style(boutique): migrate shop catalog to shadcn components"
  git push origin main
  ```
