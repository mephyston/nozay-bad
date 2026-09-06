<script lang="ts">
  import { DataTableToolbar, Button, SearchableCombobox, toSeasonOptions } from '@nba/ui';
  import { MEMBERSHIP_STATUSES, MEMBERSHIP_STATUS_LABELS } from '../../shared/membership-status';
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
  
  const isFilterActive = $derived(!!selectedGender || !!selectedType || !!selectedStatus || (selectedSeason && seasons.length > 0));

  const seasonItems = $derived(
    seasons.length > 0
      ? toSeasonOptions(seasons)
      : [{ label: 'Saison 2025-2026', value: '25-26' }]
  );
  const genderItems = [
    { label: 'Tous les genres', value: '' },
    { label: 'Homme (M)', value: 'M' },
    { label: 'Femme (F)', value: 'F' }
  ];
  const typeItems = [
    { label: 'Tous les types', value: '' },
    { label: 'Compétiteur', value: 'Competiteur' },
    { label: 'Loisir', value: 'Loisir' }
  ];
  const statusItems = [
    { label: 'Tous les statuts', value: '' },
    ...MEMBERSHIP_STATUSES.map((value) => ({ label: MEMBERSHIP_STATUS_LABELS[value], value }))
  ];
</script>

<DataTableToolbar
  bind:searchValue={searchInput}
  searchPlaceholder="Rechercher un adhérent (Nom, Licence...)"
  hasFilters={true}
  filtersActive={isFilterActive}
  onSearchSubmit={onApply}
  onSearchClear={onApply}
>
  {#snippet filters()}
    <h4 class="font-semibold text-sm border-b border-border pb-2">Options de filtrage</h4>
    <div class="space-y-3 pt-2">
        <div class="space-y-1.5">
          <label for="filter-season" class="text-xs font-semibold text-muted-foreground">Saison</label>
          <SearchableCombobox id="filter-season" items={seasonItems} bind:value={selectedSeason} onValueChange={onApply} />
        </div>
        <div class="space-y-1.5">
          <label for="filter-gender" class="text-xs font-semibold text-muted-foreground">Genre</label>
          <SearchableCombobox id="filter-gender" items={genderItems} bind:value={selectedGender} onValueChange={onApply} />
        </div>
        <div class="space-y-1.5">
          <label for="filter-type" class="text-xs font-semibold text-muted-foreground">Type d'adhérent</label>
          <SearchableCombobox id="filter-type" items={typeItems} bind:value={selectedType} onValueChange={onApply} />
        </div>
        <div class="space-y-1.5">
          <label for="filter-status" class="text-xs font-semibold text-muted-foreground">Statut</label>
          <SearchableCombobox id="filter-status" items={statusItems} bind:value={selectedStatus} onValueChange={onApply} />
        </div>
    </div>
    <div class="pt-2 flex justify-end">
      <Button variant="ghost" size="sm" onclick={onReset} class="text-xs">Réinitialiser</Button>
    </div>
  {/snippet}

  {#snippet actions()}
    <a
      href="/admin/members/import"
      class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center justify-center gap-2 border-0 no-underline h-9 w-full sm:w-auto"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
      Import Poona
    </a>
  {/snippet}
</DataTableToolbar>
