<script lang="ts">
  import { Search, Filter } from '@lucide/svelte';
  import { Button, Input, Popover } from '@nba/ui';
  import type { Season } from './members-table-types';

  let {
    searchInput = $bindable(''),
    selectedSeason = $bindable('25-26'),
    selectedGender = $bindable(''),
    selectedType = $bindable(''),
    selectedStatus = $bindable(''),
    seasons = [],
    onApply,
    onReset
  }: {
    searchInput: string;
    selectedSeason: string;
    selectedGender: string;
    selectedType: string;
    selectedStatus: string;
    seasons: Season[];
    onApply: () => void;
    onReset: () => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      onApply();
    }
  }
</script>

<div class="flex items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
  <div class="relative flex-1">
    <span class="absolute inset-y-0 left-3 flex items-center text-muted-foreground z-10">
      <Search class="w-4 h-4" />
    </span>
    <Input
      type="text"
      placeholder="Rechercher un adhérent (Nom, Licence...)"
      aria-label="Rechercher un adhérent par nom ou licence"
      class="pl-9 w-full bg-background"
      bind:value={searchInput}
      onkeydown={handleKeydown}
    />
  </div>

  <Popover.Root>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="outline" class="flex items-center gap-2">
          <Filter class="w-4 h-4" />
          Filtres
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-80 p-4 space-y-4" align="end">
      <h4 class="font-semibold text-sm border-b border-border pb-2">Options de filtrage</h4>
      
      <div class="space-y-3">
        <div class="space-y-1.5">
          <label for="filter-season" class="text-xs font-semibold text-muted-foreground">Saison</label>
          <select
            id="filter-season"
            class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            bind:value={selectedSeason}
            onchange={onApply}
          >
            {#each seasons as season}
              <option value={season.id}>{season.name}</option>
            {/each}
            {#if seasons.length === 0}
              <option value="25-26">Saison 2025-2026</option>
            {/if}
          </select>
        </div>

        <div class="space-y-1.5">
          <label for="filter-gender" class="text-xs font-semibold text-muted-foreground">Genre</label>
          <select
            id="filter-gender"
            class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            bind:value={selectedGender}
            onchange={onApply}
          >
            <option value="">Tous les genres</option>
            <option value="M">Homme (M)</option>
            <option value="F">Femme (F)</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label for="filter-type" class="text-xs font-semibold text-muted-foreground">Type d'adhérent</label>
          <select
            id="filter-type"
            class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            bind:value={selectedType}
            onchange={onApply}
          >
            <option value="">Tous les types</option>
            <option value="Competiteur">Compétiteur</option>
            <option value="Loisir">Loisir</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label for="filter-status" class="text-xs font-semibold text-muted-foreground">Statut</label>
          <select
            id="filter-status"
            class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            bind:value={selectedStatus}
            onchange={onApply}
          >
            <option value="">Tous les statuts</option>
            <option value="valide">Valide</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </div>
      </div>

      <div class="pt-2 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          onclick={onReset}
          class="text-xs"
        >
          Réinitialiser
        </Button>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
