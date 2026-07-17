# Spécification Technique : Alignement de l'En-tête & Icône d'Importation

Ce document spécifie le design, l'architecture et les exigences pour l'uniformisation du titre de la page de rapprochement bancaire et de son bouton d'importation.

## 1. Objectifs UX

* **Alignement Visuel** : Déplacer le bouton « Importer » à droite du titre de la page, comme sur la liste des adhérents.
* **Uniformisation Graphique** : Modifier le style du bouton d'importation pour qu'il corresponde exactement aux boutons d'actions primaires (ex: `bg-primary`, `px-4`, `py-2`, ombres et survols).
* **Icône Standardisée** : Conserver une icône `<Upload>` harmonieuse de taille homogène (`h-4 w-4`).

## 2. Choix d'Architecture : Encapsulation dans Svelte

Pour que le bouton d'importation reste connecté à l'état réactif Svelte (`showImportModal = true`) sans implémenter de couplage complexe entre Astro et Svelte, le bloc d'en-tête de la page sera déplacé à l'intérieur du composant `BankStatementReconciliation.svelte` :
* Retrait du titre statique de la page [import.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/import.astro).
* Insertion du bloc d'en-tête flex au sommet de [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.svelte).

## 3. Structure du Balisage (Svelte)

```html
<div class="space-y-6">
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
  
  <!-- ... suite de la page ... -->
</div>
```

## 4. Stratégie de Test

1. Exécution de `npx vitest run` pour s'assurer que le déplacement du titre ne crée pas de régressions dans la suite de tests.
2. Exécution de `npx astro check --root apps/admin-console` pour vérifier les types.
