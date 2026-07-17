# Spécification Technique : Rapports Financiers en Onglets

Ce document spécifie le design, l'architecture et les exigences pour la réorganisation des rapports de l'assemblée générale sous forme de rapports financiers découpés en onglets.

## 1. Libellés et Intégration Professionnels (UX)

* **Libellé Professionnel** : Le module est nommé « Rapports financiers ».
* **Entrées de Menu** : Mise à jour du menu latéral (`AdminLayoutInner.svelte`) et du fil d'Ariane (`reports.astro`).
* **En-tête de Page** : Le titre de la page affiche « Rapports financiers » avec une description professionnelle sur l'analyse des comptes et la gestion des budgets.

## 2. Découpage en Onglets (`GeneralMeetingReport.svelte`)

Le composant utilisera les onglets standards de `@metacult/shared-ui` :

```html
<Tabs.Root value={activeTab} onValueChange={(val) => activeTab = val as any} class="w-full space-y-6">
  <Tabs.List class="flex w-full rounded-none border-b border-border bg-transparent p-0 no-print">
    <Tabs.Trigger value="resultat" class="flex-1 py-3 text-sm font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent">Compte de résultat</Tabs.Trigger>
    <Tabs.Trigger value="tresorerie" class="flex-1 py-3 text-sm font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent">Bilan de trésorerie</Tabs.Trigger>
    <Tabs.Trigger value="budget" class="flex-1 py-3 text-sm font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent">Budget prévisionnel</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="resultat" class="space-y-6">
    <!-- Tableau du Compte de Résultat en mode 'realise' -->
    <!-- Graphiques du Réalisé -->
  </Tabs.Content>

  <Tabs.Content value="tresorerie" class="space-y-6">
    <!-- Bilan de Trésorerie -->
  </Tabs.Content>

  <Tabs.Content value="budget" class="space-y-6">
    <!-- Tableau du Compte de Résultat en mode 'previsionnel' avec inputs éditables -->
    <!-- Graphiques du Prévisionnel -->
    <!-- Bouton Enregistrer le Prévisionnel -->
  </Tabs.Content>
</Tabs.Root>
```

## 3. Style d'Impression (A4)

Pour garantir que les rapports s'impriment correctement lors d'une impression papier (`window.print()`), tous les onglets doivent être visibles dans les styles d'impression.
Nous ajouterons la règle CSS suivante :
```css
  @media print {
    .no-print {
      display: none !important;
    }
    :global([data-slot="tabs-content"]) {
      display: block !important;
    }
  }
```

## 4. Stratégie de Test

* **Mise à jour des tests** : Les tests de `GeneralMeetingReport.test.ts` seront adaptés pour cliquer sur l'onglet `Budget prévisionnel` afin d'activer le mode édition du budget.
* **Résolution des fuites** : Les composants seront stockés et nettoyés via `unmount(component)` dans le hook `afterEach` du fichier de tests.
