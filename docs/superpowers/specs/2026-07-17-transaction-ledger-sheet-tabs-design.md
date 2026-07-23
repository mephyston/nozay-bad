# Spécification Technique : Sheet de Saisie & Onglets de Rapprochement

Ce document spécifie le design, l'architecture et les exigences pour l'intégration d'un volet coulissant (Sheet) et d'un filtre par compte bancaire sous forme d'onglets (Tabs) sur la page du Grand Livre.

## 1. Objectifs et Expérience Utilisateur (UX)

* **Sheet d'édition** : Utilisation du composant `<Sheet.Root>` de `@nba/ui` pour libérer la vue centrale de l'écran lors de la saisie d'écritures comptables.
* **Boutons d'onglets de comptes** : Ajout d'onglets de filtrage (`Tous les comptes`, `Compte Courant`, `Compte Livret`, `Caisse Physique`) juste au-dessus de la table pour isoler les relevés de comptes spécifiques.
* **Filtres persistés par URL** : Utilisation du paramètre de recherche `accountId` pour propager le filtre du frontend au serveur et vice-versa.

## 2. Architecture & Transfert des Paramètres (Routage Astro)

* **index.astro** :
  * Récupère `accountId` depuis l'URL de la requête entrante.
  * Injecte `accountId` dans la requête Hono API `/accounting/transactions?accountId=...`.
  * Transmet `accountId` comme propriété (prop) au composant `TransactionLedger.svelte`.

* **TransactionLedger.svelte** :
  * Reçoit la prop `accountId`.
  * Gère un état réactif local `selectedAccount = $state(accountId || 'all')`.
  * Un effet `$effect` de Svelte 5 écoute `selectedAccount` et redirige la page vers `/admin/accounting?accountId=...` si le compte sélectionné change.

## 3. Structure Visuelle & Primitives

```html
<!-- Boutons d'onglets (Tabs) -->
<Tabs.Root bind:value={selectedAccount} class="w-full no-print">
  <Tabs.List class="grid w-full grid-cols-4 max-w-xl">
    <Tabs.Trigger value="all">Tous les comptes</Tabs.Trigger>
    <Tabs.Trigger value="current">Compte Courant</Tabs.Trigger>
    <Tabs.Trigger value="savings">Compte Livret</Tabs.Trigger>
    <Tabs.Trigger value="cash">Caisse Physique</Tabs.Trigger>
  </Tabs.List>
</Tabs.Root>

<!-- Tiroir coulissant (Sheet) -->
<Sheet.Root bind:open>
  <Sheet.Content class="sm:max-w-md p-6 bg-card border-border overflow-y-auto h-full">
    <Sheet.Header>
      <Sheet.Title>...</Sheet.Title>
      <Sheet.Description class="hidden">...</Sheet.Description>
    </Sheet.Header>
    <form onsubmit={handleAddTransaction} class="space-y-4">
      <!-- ... Grille de saisie ... -->
    </form>
  </Sheet.Content>
</Sheet.Root>
```

## 4. Stratégie de Test

1. Validation de l'intégration dans `TransactionLedger.test.ts` en s'assurant que le changement d'onglet est correctement initialisé et rendu.
2. Vérification que l'ouverture du volet coulissant (Sheet) fonctionne et conserve les champs de formulaire.
3. Vérification de la compilation et du typage avec `npx astro check`.
