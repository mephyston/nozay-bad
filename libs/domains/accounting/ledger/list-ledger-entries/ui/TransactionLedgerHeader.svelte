<script lang="ts">
  import { X } from '@lucide/svelte';
  import { Button, Badge } from '@nba/ui';
  import type { Season, Category, AccountClass } from './ledger-types';

  let {
    selectedSeason = $bindable(),
    seasons = [],
    isClosed,
    filteredCategory,
    filteredClassCode,
    categories = [],
    accountClasses = [],
    unreconciledChequesOnly,
    onOpenPanel,
    onApplySeasonChange,
    onClearFilters
  }: {
    selectedSeason: string;
    seasons?: Season[];
    isClosed: boolean;
    filteredCategory: string | null;
    filteredClassCode: string | null;
    categories?: Category[];
    accountClasses?: AccountClass[];
    unreconciledChequesOnly?: boolean;
    onOpenPanel: (type: 'recette' | 'depense' | 'transfert') => void;
    onApplySeasonChange: () => void;
    onClearFilters: () => void;
  } = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-4">
  <div class="flex items-center gap-3">
    <h2 class="text-xl font-bold tracking-tight">Journal des écritures</h2>
    <select
      class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
      bind:value={selectedSeason}
      onchange={onApplySeasonChange}
    >
      {#each seasons as season}
        <option value={season.id}>{season.name}</option>
      {/each}
      {#if seasons.length === 0}
        <option value="25-26">Saison 2025-2026</option>
      {/if}
    </select>
    {#if isClosed}
      <Badge variant="outline" class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
        Saison clôturée (Lecture seule)
      </Badge>
    {/if}
  </div>
  <div class="flex items-center gap-3">
    {#if !isClosed}
      <Button
        onclick={() => onOpenPanel('recette')}
        class="bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow transition-colors cursor-pointer"
      >
        Saisir Recette
      </Button>
      <Button
        onclick={() => onOpenPanel('depense')}
        variant="destructive"
        class="text-sm font-medium rounded-md shadow transition-colors cursor-pointer"
      >
        Saisir Dépense
      </Button>
      <Button
        onclick={() => onOpenPanel('transfert')}
        class="text-sm font-medium rounded-md shadow transition-colors cursor-pointer"
      >
        Virement Interne
      </Button>
    {/if}
  </div>
</div>

{#if filteredCategory || filteredClassCode}
  <div class="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/80 w-fit no-print">
    <span class="text-muted-foreground">Filtre actif&nbsp;:</span>
    {#if filteredCategory}
      <Badge variant="outline" class="bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold border-transparent">
        Catégorie : {categories.find(c => c.id.toString() === filteredCategory)?.adminLabel || filteredCategory}
      </Badge>
    {/if}
    {#if filteredClassCode}
      <Badge variant="outline" class="bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold border-transparent">
        Classe : {accountClasses.find(ac => ac.code === filteredClassCode)?.label || filteredClassCode} ({filteredClassCode})
      </Badge>
    {/if}
    <Button 
      variant="ghost"
      size="icon-xs"
      onclick={onClearFilters}
      class="text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-muted font-bold transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center ml-1"
      aria-label="Effacer le filtre"
    >
      <X class="w-3.5 h-3.5" />
    </Button>
  </div>
{/if}

<div class="flex flex-wrap gap-2 items-center no-print">
  <Button 
    variant={unreconciledChequesOnly ? 'default' : 'outline'}
    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer"
    onclick={() => {
      const params = new URLSearchParams(window.location.search);
      if (unreconciledChequesOnly) {
        params.delete('unreconciledCheques');
      } else {
        params.set('unreconciledCheques', 'true');
      }
      params.set('page', '1');
      window.location.href = `/admin/accounting?${params.toString()}`;
    }}
  >
    <span>🎫</span> Chèques en circulation
  </Button>
</div>
