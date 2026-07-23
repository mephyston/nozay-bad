# Spécification Technique : Panel Latéral (Sheet) pour la Création de Chèques

Ce document spécifie la modification de l'interface utilisateur pour l'enregistrement d'un chèque physique en remplaçant la boîte de dialogue modale classique (`Dialog`) par un volet coulissant latéral droit (`Sheet`).

## 1. Objectifs UX / Design

* **Fluidité** : Un panneau latéral (`Sheet`) coulissant depuis la droite de l'écran offre une meilleure intégration visuelle sur grand écran qu'un modal au centre.
* **Conservation du Contexte** : L'utilisateur conserve la liste des chèques reçus en arrière-plan pendant la saisie des informations ou l'analyse par l'IA.
* **Espace Vertical** : L'espace d'une hauteur d'écran complète facilite l'affichage combiné de la zone de photo/drag-and-drop, des alertes OCR et des champs de formulaires sans sensation de tassement.

## 2. Structure et Composants Svelte

Utilisation des composants de l'espace de noms `Sheet` exporté par `@nba/ui` :

```html
<Sheet.Root bind:open={showAddCheckModal}>
  <Sheet.Content class="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-border overflow-hidden">
    <Sheet.Header class="p-6 border-b border-border">
      <Sheet.Title>Enregistrer un Chèque</Sheet.Title>
      <Sheet.Description class="hidden">Enregistrement d'un chèque physique avec assistance IA.</Sheet.Description>
    </Sheet.Header>

    <div class="p-6 overflow-y-auto flex-grow space-y-4">
      <!-- Upload photo et champs de formulaires manuels -->
    </div>

    <Sheet.Footer class="p-6 border-t border-border bg-muted/30 flex justify-end gap-2 shrink-0">
      <!-- Actions Annuler / Enregistrer -->
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
```

## 3. Stratégie de Vérification

* Vérifier que la compilation Astro `npx astro check --root apps/admin-console` est toujours à 0 erreur.
* Exécuter la suite de tests unitaires `npx vitest run libs/features/accounting/ui/src/CheckDepositManager.test.ts` et adapter les sélecteurs de test si nécessaire.
