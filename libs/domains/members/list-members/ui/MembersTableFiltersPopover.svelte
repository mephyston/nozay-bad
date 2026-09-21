<script lang="ts">
  import { Download, Upload, Plus } from '@lucide/svelte';
  import {
    DataTableToolbar,
    Button,
    FilterSheet,
    dockDePage,
    softNavigate,
    type SwipeAction
  } from '@nba/ui';
  import { membershipStatusLabel } from '../../shared/membership-status';
  import MembersTableFilters from './MembersTableFilters.svelte';
  import type { Season } from './members-table-types';

  /**
   * La barre d'outils de la liste des adhérents, et ses critères.
   *
   * Les mêmes champs servent deux présentations : la popover, à la souris, et la
   * feuille de filtres, au doigt — ouverte depuis l'entonnoir de la pilule de
   * recherche.
   *
   * **Tout ce qui réduit la liste vit là, et nulle part ailleurs.** Un jeu de
   * segments posé au-dessus de la liste avait un temps porté le statut : deux
   * contrôles pour un même critère finissent par se contredire, et obligent à
   * chercher lequel fait foi. Ce qui reste au-dessus de la liste ne règle rien — ce
   * sont les jetons, qui disent ce qui est appliqué et permettent de le défaire.
   */
  let {
    searchInput = $bindable(''),
    selectedSeason = $bindable('25-26'),
    selectedGender = $bindable(''),
    selectedType = $bindable(''),
    selectedStatus = $bindable(''),
    selectedCohort = $bindable(''),
    seasons = [],
    exportHref = null,
    total = 0,
    onApply,
    onReset
  }: {
    searchInput: string;
    selectedSeason: string;
    selectedGender: string;
    selectedType: string;
    selectedStatus: string;
    selectedCohort: string;
    seasons: Season[];
    /** Adresse du fichier des mails aux filtres en cours, ou `null` sans le droit. */
    exportHref?: string | null;
    /** Nombre d'adhérents que donnent les critères en cours. */
    total?: number;
    onApply: () => void;
    onReset: () => void;
  } = $props();

  let filtresOuverts = $state(false);

  const isFilterActive = $derived(
    !!selectedGender || !!selectedType || !!selectedStatus || !!selectedCohort
  );

  /** Les critères posés, lisibles et retirables un à un au-dessus de la liste. */
  const criteres = $derived(
    [
      selectedStatus && {
        id: 'statut',
        label: membershipStatusLabel(selectedStatus),
        onRemove: () => {
          selectedStatus = '';
          onApply();
        }
      },
      selectedGender && {
        id: 'genre',
        label: selectedGender === 'M' ? 'Hommes' : 'Femmes',
        onRemove: () => {
          selectedGender = '';
          onApply();
        }
      },
      selectedType && {
        id: 'type',
        label: selectedType === 'Competiteur' ? 'Compétiteurs' : 'Loisir',
        onRemove: () => {
          selectedType = '';
          onApply();
        }
      },
      selectedCohort && {
        id: 'cohorte',
        label:
          selectedCohort === 'renewed'
            ? 'Renouvelés'
            : selectedCohort === 'new'
              ? 'Nouveaux'
              : 'Non renouvelés',
        onRemove: () => {
          selectedCohort = '';
          onApply();
        }
      }
    ].filter(Boolean) as { id: string; label: string; onRemove: () => void }[]
  );

  /*
    L'import et l'export descendent dans la barre du bas : ce sont les deux seules
    actions de cet écran, et elles vivaient en haut d'une barre d'outils qui défile.
    Aucun adhérent ne se crée ici — ils viennent de Poona — d'où l'import en tête.
  */
  $effect(() => {
    const actions: SwipeAction[] = [
      {
        id: 'import',
        label: 'Import Poona',
        icon: Upload,
        run: () => softNavigate('/admin/members/import')
      }
    ];
    if (exportHref) {
      actions.push({
        id: 'export',
        label: 'Exporter les mails',
        icon: Download,
        run: () => {
          window.location.href = exportHref;
        }
      });
    }
    return dockDePage.declarerActions(actions);
  });
</script>

<div class="w-full space-y-3">
  <DataTableToolbar
    bind:searchValue={searchInput}
    searchPlaceholder="Rechercher un adhérent (nom, licence…)"
    dockSearch
    hasFilters={true}
    filtersActive={isFilterActive}
    activeFilters={criteres}
    onSearchSubmit={onApply}
    onSearchClear={onApply}
    onOpenFilters={() => (filtresOuverts = true)}
  >
    {#snippet filters()}
      <h4 class="border-b border-border pb-2 text-sm font-semibold">Options de filtrage</h4>
      <div class="space-y-3 pt-2">
        <MembersTableFilters
          bind:selectedSeason
          bind:selectedStatus
          bind:selectedGender
          bind:selectedType
          bind:selectedCohort
          {seasons}
          {onApply}
        />
      </div>
      <div class="flex justify-end pt-2">
        <Button variant="ghost" size="sm" onclick={onReset} class="text-xs">Réinitialiser</Button>
      </div>
    {/snippet}

    {#snippet actions()}
      <!-- Sur téléphone, ces deux actions vivent dans la barre du bas. -->
      {#if exportHref}
        <Button href={exportHref} download variant="secondary" class="hidden h-9 gap-2 md:flex">
          <Download class="h-4 w-4" />
          Exporter les mails
        </Button>
      {/if}
      <Button href="/admin/members/import" class="hidden h-9 gap-2 md:inline-flex">
        <Plus class="h-4 w-4" />
        Import Poona
      </Button>
    {/snippet}
  </DataTableToolbar>

</div>

<FilterSheet
  bind:open={filtresOuverts}
  description="Ces critères s'ajoutent à la recherche."
  resultCount={total}
  itemName="adhérent"
  hasActiveFilters={isFilterActive}
  onReset={() => {
    onReset();
    filtresOuverts = false;
  }}
>
  <div class="space-y-3">
    <MembersTableFilters
      bind:selectedSeason
      bind:selectedStatus
      bind:selectedGender
      bind:selectedType
      bind:selectedCohort
      {seasons}
      {onApply}
    />
  </div>
</FilterSheet>
