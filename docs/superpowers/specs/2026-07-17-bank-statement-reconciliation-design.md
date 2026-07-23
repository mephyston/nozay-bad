# Spécification Technique : Rapprochement Bancaire (Shadcn Checkbox)

Ce document spécifie le design, l'architecture et les exigences pour la standardisation des éléments interactifs de type case à cocher (checkbox) sur la page de Rapprochement Bancaire.

## 1. Objectifs et Expérience Utilisateur (UX)

* **Cases à cocher standardisées** : Remplacement de l'ensemble des balises `<input type="checkbox">` brutes par le composant `<Checkbox>` de `@nba/ui`.
* **Tests unitaires robustes et accessibles** : Mise à jour des sélecteurs de tests dans `BankStatementReconciliation.test.ts` pour cibler les éléments via leur rôle accessible `[role="checkbox"]` plutôt que leur balise HTML.

## 2. Structure et Propriétés du Composant Checkbox

Le composant `<Checkbox>` sera utilisé aux trois endroits clés du fichier `BankStatementReconciliation.svelte` :

```html
<!-- 1. Case de sélection de transaction bancaire -->
<Checkbox
  checked={!!selectedTxIds[bt.id]}
  onCheckedChange={(val) => {
    selectedTxIds[bt.id] = !!val;
  }}
  onclick={(e) => e.stopPropagation()}
  class="w-4 h-4 shrink-0 mt-0.5"
/>

<!-- 2. Case de sélection de facture suggérée -->
<Checkbox
  class="invoice-checkbox w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer animate-none"
  checked={selectedInvoiceIds.has(inv.id)}
  onCheckedChange={() => toggleInvoiceSelection(inv.id)}
/>
```

## 3. Stratégie de Test

La suite de tests unitaires `BankStatementReconciliation.test.ts` sera modifiée pour s'adapter à la structure du composant Shadcn :
* Remplacement de `input[type="checkbox"]` par `[role="checkbox"]`.
* Remplacement de `input.invoice-checkbox` par `.invoice-checkbox`.
* Utilisation de `.click()` sur l'élément pour simuler l'interaction.
* Tous les 11 tests unitaires doivent s'exécuter et réussir sans erreur.
* `npx astro check` doit s'exécuter sans erreur.
