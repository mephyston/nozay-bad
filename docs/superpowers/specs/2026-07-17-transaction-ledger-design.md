# Spécification Technique : Refonte du Grand Livre (Transaction Ledger)

Ce document spécifie le design, l'architecture et les exigences pour la refonte du composant Grand Livre (`TransactionLedger.svelte`) avec une standardisation des composants de navigation d'actions et du formulaire de saisie en grille.

## 1. Objectifs et Expérience Utilisateur (UX)

La refonte vise à standardiser le journal des écritures comptables avec les composants Shadcn Svelte :
* **Popover d'actions** : Remplacement du menu d'actions customisé par un composant `<Popover.Root>` standardisé de `@nba/ui`.
* **Formulaire en Grille** : Optimisation visuelle du formulaire de saisie dans le tiroir `<Dialog.Content>` via des conteneurs grids et des libellés `<Label>`.
* **Simplification du Code** : Retrait des écouteurs globaux de clic manuels et de la gestion réactive de l'ID du menu ouvert.

## 2. Simplification de la Logique Métier (Code Cleanup)

Le composant `TransactionLedger.svelte` verra les modifications de logique suivantes :
* **Retrait de l'écouteur global** : L'effet de tracking de clic `window.addEventListener('click')` est obsolète car le composant `Popover` gère nativement sa fermeture lors du clic en dehors.
* **Variables d'état supprimées** :
  * `openDropdownId`
  * `toggleDropdown()`

## 3. Structure du Formulaire (Grille Responsives)

Le formulaire de saisie coulissant sera restructuré en colonnes de cette façon :

```html
<form onsubmit={handleAddTransaction} class="space-y-4">
  <!-- Ligne 1 : Montant et Date -->
  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label for="amount-input">Montant (€)</Label>
      <Input id="amount-input" type="number" ... />
    </div>
    <div>
      <Label for="date-input">Date</Label>
      <Input id="date-input" type="date" ... />
    </div>
  </div>

  <!-- Ligne 2 : Saison -->
  <div>
    <Label for="season-select-panel">Saison d'affectation</Label>
    <select id="season-select-panel" ...>...</select>
  </div>

  <!-- Ligne 3 : Catégorie / Comptes financiers -->
  {#if showPanel !== 'transfert'}
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="category-select">Catégorie</Label>
        <select id="category-select" ...>...</select>
      </div>
      <div>
        <Label for="account-select">Compte financier</Label>
        <select id="account-select" ...>...</select>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="account-select">Compte Source</Label>
        <select id="account-select" ...>...</select>
      </div>
      <div>
        <Label for="dest-account-select">Compte Destinataire</Label>
        <select id="dest-account-select" ...>...</select>
      </div>
    </div>
  {/if}

  <!-- Ligne 4 : Moyen de paiement -->
  {#if showPanel !== 'transfert'}
    <div>
      <Label for="payment-method-select">Moyen de paiement</Label>
      <select id="payment-method-select" ...>...</select>
    </div>
  {/if}

  <!-- Ligne 5 & 6 : Description & Référence -->
  <div>
    <Label for="description-input">Description / Motif</Label>
    <Input id="description-input" ... />
  </div>
  <div>
    <Label for="ref-input">Référence (Optionnel)</Label>
    <Input id="ref-input" ... />
  </div>
</form>
```

## 4. Stratégie de Test

La suite de tests unitaires `TransactionLedger.test.ts` sera exécutée pour s'assurer qu'aucune régression fonctionnelle n'est introduite :
1. Les actions de Popover doivent correctement déclencher `startEdit` et `handleDelete`.
2. Le formulaire de soumission doit valider et envoyer les bons payloads au serveur.
3. Toutes les variables d'état et liaisons doivent fonctionner correctement dans Svelte 5.
