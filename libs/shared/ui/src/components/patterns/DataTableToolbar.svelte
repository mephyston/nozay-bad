<script lang="ts">
  import { Filter } from '@lucide/svelte';
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
