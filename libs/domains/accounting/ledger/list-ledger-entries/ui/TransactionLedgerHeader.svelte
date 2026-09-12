<script lang="ts">
  import { X, Search, Filter } from '@lucide/svelte';
  import { Button, Badge, Input, DropdownMenu, Checkbox, PageHeader } from '@nba/ui';
  import type { Season, Category, AccountClass } from './ledger-types';
  import { accrualLabel } from '../../../shared/accrual-labels';

  let {
    selectedSeason = $bindable(),
    seasons = [],
    isClosed,
    filteredCategory,
    filteredClassCode,
    filteredAccrual = null,
    categories = [],
    accountClasses = [],
    unreconciledChequesOnly,
    searchQuery = '',
    onOpenPanel,
    onApplySeasonChange,
    onClearFilters
  }: {
    selectedSeason: string;
    seasons?: Season[];
    isClosed: boolean;
    filteredCategory: string | null;
    filteredClassCode: string | null;
    filteredAccrual?: string | null;
    categories?: Category[];
    accountClasses?: AccountClass[];
    unreconciledChequesOnly?: boolean;
    searchQuery?: string;
    onOpenPanel: (type: 'recette' | 'depense' | 'transfert') => void;
    onApplySeasonChange: () => void;
    onClearFilters: () => void;
  } = $props();
</script>

<PageHeader title="Journal des écritures">
  {#snippet actions()}
    <div class="flex items-center gap-3">

      {#if isClosed}
        <Badge variant="secondary" size="lg" shape="square">
          Saison clôturée (Lecture seule)
        </Badge>
      {/if}
    </div>
  {/snippet}
</PageHeader>

{#if filteredCategory || filteredClassCode || filteredAccrual}
  <div class="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/80 w-fit no-print">
    <span class="text-muted-foreground">Filtre actif&nbsp;:</span>
    {#if filteredCategory}
      <Badge variant="primary-soft" shape="square">
        Catégorie : {categories.find(c => c.id.toString() === filteredCategory)?.adminLabel || filteredCategory}
      </Badge>
    {/if}
    {#if filteredClassCode}
      <Badge variant="primary-soft" shape="square">
        Classe : {accountClasses.find(ac => ac.code === filteredClassCode)?.label || filteredClassCode} ({filteredClassCode})
      </Badge>
    {/if}
    {#if filteredAccrual}
      <Badge variant="primary-soft" shape="square">
        Régularisation : {accrualLabel(filteredAccrual) || filteredAccrual}
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

