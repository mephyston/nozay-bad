<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button } from '../ui/button/index.js';
  import ResponsiveSheet from './ResponsiveSheet.svelte';
  import { auPluriel } from '../../lib/pluriel.js';

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

  const libelle = $derived.by(() => {
    if (resultCount === undefined) return 'Afficher';
    const pluriel = itemNamePlural ?? auPluriel(itemName ?? '');
    return `Afficher ${resultCount} ${resultCount === 1 ? itemName : pluriel}`;
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
