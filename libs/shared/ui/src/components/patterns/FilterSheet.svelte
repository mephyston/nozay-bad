<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button } from '../ui/button/index.js';
  import ResponsiveSheet from './ResponsiveSheet.svelte';
  import { accorder } from '../../lib/pluriel.js';

  /**
   * Les filtres avancés d'une liste.
   *
   * Le bouton principal porte **le nombre de résultats** : c'est la convention qui
   * évite l'aller-retour « j'applique, je regarde, je reviens corriger ». On sait
   * avant de fermer ce que la fermeture va montrer.
   */
  let {
    open = $bindable(false),
    title = 'Filtres',
    description,
    resultCount,
    itemName = 'résultat',
    itemNamePlural,
    hasActiveFilters = false,
    onReset,
    children
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    /** Nombre de résultats que donneraient les filtres en cours. */
    resultCount?: number;
    itemName?: string;
    itemNamePlural?: string;
    hasActiveFilters?: boolean;
    onReset?: () => void;
    children: Snippet;
  } = $props();

  /*
    Zéro prend le singulier : « Afficher 0 séance », et non « 0 séances ». La règle
    vit dans `accorder`, écrit pour ça — la comparaison à 1 faite ici l'ignorait, et
    la faute se voyait sur toutes les feuilles de filtres dès qu'un critère ne laissait
    rien passer, c'est-à-dire précisément au moment où on la lit.
  */
  const libelle = $derived.by(() => {
    if (resultCount === undefined) return 'Afficher';
    return `Afficher ${resultCount} ${accorder(resultCount, itemName ?? '', itemNamePlural)}`;
  });
</script>

<ResponsiveSheet bind:open {title} {description} detents={[0.55, 0.92]} size="sm">
  <!--
    L'espacement des critères appartient à la feuille, pas à ses appelants.

    Chacun posait le sien, et l'un d'eux l'avait oublié : ses deux champs se touchaient.
    Un écart qu'on peut omettre finit par l'être.
  -->
  <div class="space-y-4">
    {@render children()}
  </div>

  {#snippet footer()}
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {#if onReset}
        <Button
          type="button"
          variant="ghost"
          disabled={!hasActiveFilters}
          onclick={onReset}
          class="w-full sm:w-auto"
        >
          Tout effacer
        </Button>
      {/if}
      <Button type="button" onclick={() => (open = false)} class="w-full sm:w-auto">
        {libelle}
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
