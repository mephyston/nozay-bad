<script lang="ts">
  import { Search, Filter, X } from '@lucide/svelte';
  import { Input } from '../ui/input';
  import { Button } from '../ui/button';
  import * as DropdownMenu from '../ui/dropdown-menu';
  import type { Snippet } from 'svelte';

  let {
    searchValue = $bindable(''),
    searchPlaceholder = 'Rechercher...',
    hasSearch = true,
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
    hasFilters?: boolean;
    filtersActive?: boolean;
    onSearchSubmit?: (value: string) => void;
    onSearchClear?: () => void;
    filters?: Snippet;
    actions?: Snippet;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && onSearchSubmit) {
      onSearchSubmit(searchValue);
    }
  }

  function handleClear() {
    searchValue = '';
    if (onSearchClear) onSearchClear();
    else if (onSearchSubmit) onSearchSubmit('');
  }
</script>

<div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
  {#if hasSearch}
    <div class="relative flex-1 sm:w-64">
      <Input
      type="text"
      placeholder={searchPlaceholder}
      bind:value={searchValue}
      onkeydown={handleKeydown}
      class="!pl-9 !pr-8 bg-background border-border h-9"
    />
    <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
    {#if searchValue}
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
        onclick={handleClear}
      >
        <X class="h-3 w-3" />
      </button>
    {/if}
  </div>
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
