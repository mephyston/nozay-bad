<script lang="ts">
  import { Download, Plus } from '@lucide/svelte';
  import {
    Button,
    ChoiceField,
    DataTableToolbar,
    FilterSheet,
    FormField,
    dockDePage,
    toSeasonOptions,
    type SwipeAction
  } from '@nba/ui';
  import type { Season } from './expenses-types';

  /**
   * La barre d'outils des notes de frais, et ses critères.
   *
   * Les deux tableaux la recopiaient par snippets interposés, chacun réinstallant sa
   * propre `DataTableToolbar`. **Tout ce qui réduit la liste est derrière la loupe** :
   * la saison, qui fixe le périmètre, et la vue, qui choisit entre la file d'attente et
   * l'historique. Ce qui reste au-dessus de la liste ne règle rien — ce sont les jetons.
   */
  let {
    searchTerm = $bindable(''),
    selectedSeason = $bindable(''),
    activeTab = $bindable('pending'),
    seasons = [],
    pendingCount = 0,
    historyCount = 0,
    resultCount = 0,
    isClosed = false,
    exportHref,
    onCreate
  }: {
    searchTerm?: string;
    selectedSeason?: string;
    activeTab?: 'pending' | 'history';
    seasons?: Season[];
    pendingCount?: number;
    historyCount?: number;
    resultCount?: number;
    isClosed?: boolean;
    exportHref?: string;
    onCreate?: () => void;
  } = $props();

  let filtresOuverts = $state(false);

  const seasonItems = $derived(
    toSeasonOptions(seasons).map((o) => ({ value: String(o.value), label: o.label }))
  );

  const VUES = $derived([
    { value: 'pending', label: `En attente (${pendingCount})` },
    { value: 'history', label: `Historique (${historyCount})` }
  ]);

  /* La file d'attente est le défaut : l'historique est la restriction, et se dit en jeton. */
  const filtreActif = $derived(activeTab !== 'pending');

  const criteres = $derived(
    filtreActif
      ? [{ id: 'vue', label: 'Historique', onRemove: () => (activeTab = 'pending') }]
      : []
  );

  /*
    `ChoiceField` travaille sur des chaînes libres ; la vue est une union fermée. Le
    miroir évite d'y lier l'une à l'autre — rien dans la chaîne d'outils ne signalerait
    qu'une chaîne quelconque y est rentrée.
  */
  let vueChoisie = $state<string>(activeTab);
  $effect(() => {
    vueChoisie = activeTab;
  });

  $effect(() => {
    const actions: SwipeAction[] = [];
    if (!isClosed && onCreate) {
      actions.push({ id: 'creer', label: 'Créer une note de frais', icon: Plus, run: onCreate });
    }
    if (exportHref) {
      actions.push({
        id: 'export',
        label: 'Exporter (ZIP)',
        icon: Download,
        run: () => {
          window.location.href = exportHref;
        }
      });
    }
    if (actions.length === 0) return;
    return dockDePage.declarerActions(actions);
  });
</script>

{#snippet criteresDeListe()}
  <FormField id="filter-season" label="Saison">
    <ChoiceField id="filter-season" label="Saison" options={seasonItems} bind:value={selectedSeason} />
  </FormField>

  <FormField id="filter-status" label="Vue">
    <ChoiceField
      id="filter-status"
      label="Vue"
      options={VUES}
      bind:value={vueChoisie}
      onChange={(v) => (activeTab = v as 'pending' | 'history')}
    />
  </FormField>
{/snippet}

<DataTableToolbar
  bind:searchValue={searchTerm}
  searchPlaceholder="Rechercher une note (bénéficiaire, motif…)"
  dockSearch
  hasFilters={true}
  filtersActive={filtreActif}
  activeFilters={criteres}
  onOpenFilters={() => (filtresOuverts = true)}
>
  {#snippet filters()}
    <h4 class="border-b border-border pb-2 text-sm font-semibold">Options de filtrage</h4>
    <div class="space-y-4 pt-2">
      {@render criteresDeListe()}
    </div>
  {/snippet}

  {#snippet actions()}
    <!-- Sur téléphone, ces deux actions vivent dans la barre du bas. -->
    {#if !isClosed && onCreate}
      <Button onclick={onCreate} class="hidden h-9 gap-2 md:inline-flex">
        <Plus class="h-4 w-4" />
        Créer une note de frais
      </Button>
    {/if}
    {#if exportHref}
      <Button href={exportHref} variant="secondary" target="_blank" download class="hidden h-9 gap-2 md:inline-flex">
        <Download class="h-4 w-4" />
        Exporter (ZIP)
      </Button>
    {/if}
  {/snippet}
</DataTableToolbar>

<FilterSheet
  bind:open={filtresOuverts}
  description="Ces critères s'ajoutent à la recherche."
  {resultCount}
  itemName="note de frais"
  itemNamePlural="notes de frais"
  hasActiveFilters={filtreActif}
  onReset={() => {
    activeTab = 'pending';
    filtresOuverts = false;
  }}
>
  {@render criteresDeListe()}
</FilterSheet>
