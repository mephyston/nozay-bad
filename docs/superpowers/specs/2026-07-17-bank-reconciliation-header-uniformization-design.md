# Spécification Technique : Alignement de l'En-tête & Icône d'Importation (Astro Level)

Ce document spécifie le design, l'architecture et les exigences pour l'uniformisation du titre de la page de rapprochement bancaire et de son bouton d'importation au niveau du layout Astro.

## 1. Objectifs UX

* **Alignement Visuel** : Placer le bouton « Importer » à droite du titre de la page au niveau d'Astro, comme sur la liste des adhérents.
* **Uniformisation Graphique** : Utiliser le style d'action primaire (`bg-primary`, `px-4`, `py-2`, ombres et survols) pour le bouton.
* **Icône Standardisée** : Inclure l'icône de téléchargement (`Upload`) dans le bouton.
* **Statut de Clôture** : Afficher le badge « Saison clôturée (Lecture seule) » au niveau de l'en-tête Astro si la saison est fermée.

## 2. Choix d'Architecture : Événement personnalisé (CustomEvent)

Pour lier le bouton d'importation situé dans le layout HTML d'Astro avec la logique réactive de la modale Svelte :
1. Le bouton HTML dans `import.astro` dispatch un événement personnalisé `open-bank-import` sur `window` lors du clic.
2. Le composant Svelte `BankStatementReconciliation.svelte` écoute cet événement via un écouteur global sur `window` et ouvre la modale d'importation (`showImportModal = true`).
3. L'en-tête interne du composant Svelte est nettoyé pour supprimer le bouton redondant et l'ancienne barre d'information.

## 3. Structure du Balisage dans import.astro

```html
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Rapprochement bancaire</h1>
          <p class="text-muted-foreground mt-2">
            Rapprochez les relevés bancaires importés avec les écritures du grand livre et validez les factures.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          {isClosed && (
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
              Saison clôturée (Lecture seule)
            </span>
          )}
          {!isClosed && bankTransactionsList.length > 0 && (
            <button
              id="trigger-import-btn"
              onclick="window.dispatchEvent(new CustomEvent('open-bank-import'))"
              class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-2 border-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Importer
            </button>
          )}
        </div>
      </div>
```

## 4. Écouteur d'Événements dans Svelte

```typescript
  import { onMount } from 'svelte';

  onMount(() => {
    const handleOpen = () => {
      if (!isClosed) {
        showImportModal = true;
      }
    };
    window.addEventListener('open-bank-import', handleOpen);
    return () => {
      window.removeEventListener('open-bank-import', handleOpen);
    };
  });
```
