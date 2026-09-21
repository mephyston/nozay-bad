<script lang="ts">
  import { Filter, X } from '@lucide/svelte';
  import { Button } from '../ui/button';
  import ListSearchField from './ListSearchField.svelte';
  import { cn } from '../../lib/utils.js';
  import { dockDePage } from '../../lib/page-dock.svelte.js';
  import * as DropdownMenu from '../ui/dropdown-menu';
  import type { Snippet } from 'svelte';

  let {
    searchValue = $bindable(''),
    searchPlaceholder = 'Rechercher...',
    hasSearch = true,
    dockSearch = false,
    activeFilters = [],
    hasFilters = false,
    filtersActive = false,
    onSearchSubmit,
    onSearchClear,
    filters,
    actions
  }: {
    searchValue?: string;
    searchPlaceholder?: string;
    hasSearch?: boolean;
    /**
     * Confie la recherche à la barre du bas sur téléphone, et masque le champ ici
     * sous `md`. Le pouce n'a pas à remonter en haut de l'écran pour chercher.
     */
    dockSearch?: boolean;
    /**
     * Les critères posés, et de quoi les retirer un à un.
     *
     * Un filtre appliqué doit se voir et se défaire sans rouvrir le panneau qui l'a
     * posé — sinon la liste reste réduite sans que rien ne le dise. Les jetons se
     * lisent à tout écran : sur ordinateur aussi, la pastille du panneau dit qu'il y
     * a des filtres, jamais lesquels.
     */
    activeFilters?: { id: string; label: string; onRemove: () => void }[];
    hasFilters?: boolean;
    filtersActive?: boolean;
    onSearchSubmit?: (value: string) => void;
    onSearchClear?: () => void;
    filters?: Snippet;
    actions?: Snippet;
  } = $props();

  // Le placeholder et la fonction sont stables : l'effet ne se rejoue pas à la frappe.
  $effect(() => {
    if (!dockSearch || !hasSearch) return;
    return dockDePage.declarerRecherche({
      placeholder: searchPlaceholder,
      valeur: searchValue,
      onSubmit: rechercher,
    });
  });

  function rechercher(valeur: string) {
    searchValue = valeur;
    if (valeur === '' && onSearchClear) onSearchClear();
    else onSearchSubmit?.(valeur);
  }
</script>

<div class="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center w-full">
  {#if activeFilters.length > 0}
    <div class="flex max-w-full flex-wrap items-center gap-2 self-start">
      {#each activeFilters as critere (critere.id)}
        <button
          type="button"
          onclick={critere.onRemove}
          class="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-accent px-3 text-sm text-accent-foreground"
        >
          <span class="truncate">{critere.label}</span>
          <X class="size-4 shrink-0" />
          <span class="sr-only">Retirer ce filtre</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if hasSearch && dockSearch && searchValue}
    <!--
      Le filtre appliqué, et de quoi le retirer.
      Sur téléphone, le champ est descendu dans la barre du bas et se referme après
      validation : sans ce jeton, la liste restait filtrée sans que rien ne le dise
      ni n'offre de revenir en arrière.
    -->
    <button
      type="button"
      onclick={() => rechercher('')}
      class="inline-flex h-9 max-w-full items-center gap-1.5 self-start rounded-full bg-accent px-3 text-sm text-accent-foreground md:hidden"
    >
      <span class="truncate">« {searchValue} »</span>
      <X class="size-4 shrink-0" />
      <span class="sr-only">Retirer la recherche</span>
    </button>
  {/if}

  {#if hasSearch}
    <!--
      `debounce={0}` : cette recherche part au serveur. La relancer à chaque
      lettre, ce sont autant de requêtes pour une seule question.
    -->
    <ListSearchField
      bind:value={searchValue}
      placeholder={searchPlaceholder}
      onSubmit={rechercher}
      debounce={0}
      class={cn('flex-1 sm:w-64', dockSearch && 'hidden md:block')}
    />
  {/if}

  {#if hasFilters && filters}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {#snippet child({ props })}
          <Button {...props} variant="outline" class="flex items-center gap-2 h-9 relative">
            <Filter class="w-4 h-4" /> Filtres
            {#if filtersActive}
              <span class="flex h-2 w-2 rounded-full bg-primary absolute -top-1 -right-1"></span>
            {/if}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content class="w-72 p-4" align="end">
        <div class="space-y-4">
          <h4 class="font-medium text-sm leading-none">Filtres rapides</h4>
          <div class="space-y-4">
            {@render filters()}
          </div>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}

  {#if actions}
    {@render actions()}
  {/if}
</div>
