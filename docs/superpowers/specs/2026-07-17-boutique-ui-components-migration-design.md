# Spécification de Design - Migration des Composants de la Boutique vers Shadcn-Svelte

## Contexte et Objectif
Dans le cadre de l'uniformisation du design system de l'application, nous migrons les composants de l'application **Boutique** vers les composants standardisés Shadcn-Svelte disponibles dans `@nba/ui`.

Les deux composants ciblés sont :
1. `apps/boutique/src/components/ExpenseReportForm.svelte` (Formulaire de note de frais)
2. `apps/boutique/src/components/ShopCatalog.svelte` (Catalogue de commande)

Toute la logique métier, la gestion des runes Svelte 5 (`$state`, `$derived`, `$props`), les interactions réseau (fetch), les validations Turnstile et le comportement clavier/focus doivent être préservés à l'identique pour éviter toute régression.

## Composants de Design System Consommés
Nous utiliserons les primitives importées depuis `@nba/ui` :
* **`Button`** : Pour soumettre les notes de frais et les commandes.
* **`Input`** : Pour les saisies de recherche, montants et quantités.
* **`Badge`** : Pour l'affichage des prix et de l'état des stocks.
* **`Card`** : Pour structurer les fiches produits et les formulaires.
* **`Label`** : Pour associer proprement les intitulés aux champs de formulaire.

## Spécification de Refactoring

### 1. Formulaire de Note de Frais (`ExpenseReportForm.svelte`)
* **Card Structure** : 
  Le formulaire complet est contenu dans une structure `<Card.Root>`.
  Le bandeau d'en-tête existant avec son dégradé violet/indigo sera conservé dans le `<Card.Header>` pour conserver la signature visuelle de la boutique, mais sa bordure et ses coins s'adapteront à la Card.
* **Saisie du Demandeur** :
  L'élément `<input>` de recherche d'adhérents sera remplacé par le composant `<Input>`.
  Le label utilisera le composant `<Label>` avec un attribut `for` pointant vers l'input.
  Le menu déroulant personnalisé (listbox) conservera son positionnement absolu avec des classes Tailwind uniformisées (`bg-popover border border-border shadow-xl rounded-xl`).
* **Justificatif** :
  La zone de drag & drop pour l'upload d'images conservera sa bordure pointillée, mais profitera de l'harmonie des variables CSS de Tailwind v4 (`border-border hover:border-primary/50`).
* **Actions** :
  Le bouton de soumission utilisera `<Button type="submit">` avec le dégradé existant et un effet de transition fluide.

### 2. Catalogue de Boutique (`ShopCatalog.svelte`)
* **Sélecteur d'Adhérent Global** :
  Tout comme pour le formulaire de note de frais, l'en-tête de sélection d'adhérent utilisera les composants `<Label>` et `<Input>` avec des styles uniformisés.
* **Grille de Produits** :
  La grille de produits reste une disposition responsive standard. Chaque produit est encapsulé dans un `<Card.Root class="flex flex-col h-full bg-card border-border/80">`.
  * **Header** : Titre du produit et badge de statut du stock.
  * **Content** : Affichage du prix et image/description si présentes.
  * **Footer** : Formulaire d'achat individuel contenant la sélection de quantité, le choix du moyen de paiement, et le bouton d'achat.
* **Formulaire d'Achat** :
  * La sélection de quantité utilisera `<Input type="number">`.
  * Le bouton de commande utilisera `<Button>` avec les icônes associées.

## Validation et Robustesse
* **Vérification ESLint** : 0 erreur de frontières Nx ou de syntaxe dans la boutique.
* **Vérification Astro** : Compilation impeccable de l'application boutique (`npx astro check --root apps/boutique` si applicable, ou globalement sur admin-console).
* **Vérification Vitest** :
  * Exécution et passage de tous les tests unitaires :
    * `npx vitest run apps/boutique/src/components/ExpenseReportForm.test.ts`
    * `npx vitest run apps/boutique/src/components/ShopCatalog.test.ts`
