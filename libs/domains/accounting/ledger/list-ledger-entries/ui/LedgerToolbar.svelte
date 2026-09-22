<script lang="ts">
  import { ArrowLeftRight, ChevronDown, Download, Minus, Plus } from '@lucide/svelte';
  import {
    Button,
    ChoiceField,
    DataTableToolbar,
    DropdownMenu,
    FilterSheet,
    FormField,
    SwitchField,
    dockDePage,
    softNavigate,
    type SwipeAction
  } from '@nba/ui';
  import { accrualLabel } from '../../../shared/accrual-labels';
  import type { AccountClass, Category } from './ledger-types';
  import { effacementTotal, urlDuJournal } from './ledger-filters';

  /**
   * La barre d'outils du journal, et ses critères.
   *
   * **Tout ce qui réduit la liste est derrière la loupe, et nulle part ailleurs.** La
   * saison et le compte fixent le périmètre ; le mois, les chèques en circulation et
   * les critères posés par un lien de rapport — catégorie, classe, régularisation — le
   * réduisent, et se disent en jetons au-dessus de la liste. Ces derniers vivaient dans
   * une bande à part, sous le titre, qui ne se retirait que d'un bloc.
   */
  let {
    searchQuery = $bindable(''),
    selectedSeason = $bindable(''),
    selectedAccount = $bindable(''),
    month = '',
    unreconciledChequesOnly = false,
    filteredCategory = null,
    filteredClassCode = null,
    filteredAccrual = null,
    categories = [],
    accountClasses = [],
    seasonItems = [],
    accountItems = [],
    isClosed = false,
    resultCount = 0,
    exportHref,
    onOpenPanel,
    onApplySeasonChange
  }: {
    searchQuery?: string;
    selectedSeason?: string;
    selectedAccount?: string;
    month?: string;
    unreconciledChequesOnly?: boolean;
    filteredCategory?: string | null;
    filteredClassCode?: string | null;
    filteredAccrual?: string | null;
    categories?: Category[];
    accountClasses?: AccountClass[];
    seasonItems?: { label: string; value: string | number }[];
    accountItems?: { label: string; value: string | number }[];
    isClosed?: boolean;
    /** Ce que la page affiche, pour le bouton de la feuille de filtres. */
    resultCount?: number;
    exportHref?: string;
    onOpenPanel: (type: 'recette' | 'depense' | 'transfert') => void;
    onApplySeasonChange: () => void;
  } = $props();

  let filtresOuverts = $state(false);

  const recherche = () => (typeof window === 'undefined' ? '' : window.location.search);
  const naviguer = (changements: Parameters<typeof urlDuJournal>[1]) =>
    softNavigate(urlDuJournal(recherche(), changements));

  const MOIS = [
    { value: '', label: 'Tous les mois' },
    { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' }, { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' }, { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' }
  ];

  const libelleDeMois = (v: string) => MOIS.find((m) => m.value === v)?.label ?? v;

  const isFilterActive = $derived(
    !!month || unreconciledChequesOnly || !!filteredCategory || !!filteredClassCode || !!filteredAccrual
  );

  /** Les critères posés, lisibles et retirables un à un au-dessus de la liste. */
  const criteres = $derived(
    [
      month && { id: 'mois', label: libelleDeMois(month), onRemove: () => naviguer({ month: null }) },
      unreconciledChequesOnly && {
        id: 'cheques',
        label: 'Chèques en circulation',
        onRemove: () => naviguer({ unreconciledCheques: null })
      },
      filteredCategory && {
        id: 'categorie',
        label: categories.find((c) => String(c.id) === filteredCategory)?.adminLabel ?? filteredCategory,
        onRemove: () => naviguer({ category: null })
      },
      filteredClassCode && {
        id: 'classe',
        label: `Classe ${accountClasses.find((a) => a.code === filteredClassCode)?.label ?? filteredClassCode}`,
        onRemove: () => naviguer({ classCode: null })
      },
      filteredAccrual && {
        id: 'regularisation',
        label: accrualLabel(filteredAccrual) || filteredAccrual,
        onRemove: () => naviguer({ accrual: null })
      }
    ].filter(Boolean) as { id: string; label: string; onRemove: () => void }[]
  );

  /*
    Les trois saisies descendent dans la barre du bas, avec l'export : ce sont les
    actions de l'écran, et elles vivaient en haut d'une barre d'outils qui défile hors
    de vue dès qu'on parcourt le journal.
  */
  $effect(() => {
    const actions: SwipeAction[] = [];
    if (!isClosed) {
      actions.push(
        { id: 'recette', label: 'Saisir une recette', icon: Plus, run: () => onOpenPanel('recette') },
        { id: 'depense', label: 'Saisir une dépense', icon: Minus, run: () => onOpenPanel('depense') },
        { id: 'transfert', label: 'Virement interne', icon: ArrowLeftRight, run: () => onOpenPanel('transfert') }
      );
    }
    if (exportHref) {
      actions.push({
        id: 'export',
        label: 'Exporter (CSV)',
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
    <ChoiceField
      id="filter-season"
      label="Saison"
      options={seasonItems.map((s) => ({ value: String(s.value), label: s.label }))}
      bind:value={selectedSeason}
      onChange={onApplySeasonChange}
    />
  </FormField>

  <FormField id="filter-account" label="Compte">
    <ChoiceField
      id="filter-account"
      label="Compte"
      options={accountItems.map((a) => ({ value: String(a.value), label: a.label }))}
      bind:value={selectedAccount}
      onChange={(v) => naviguer({ accountId: v })}
    />
  </FormField>

  <FormField id="filter-month" label="Mois">
    <ChoiceField
      id="filter-month"
      label="Mois"
      options={MOIS}
      value={month}
      onChange={(v) => naviguer({ month: v || null })}
    />
  </FormField>

  <SwitchField
    id="filter-cheques"
    label="Chèques en circulation"
    hint="Les écritures dont le chèque n'est pas encore encaissé."
    checked={unreconciledChequesOnly}
    onChange={(v) => naviguer({ unreconciledCheques: v ? 'true' : null })}
  />
{/snippet}

<DataTableToolbar
  bind:searchValue={searchQuery}
  searchPlaceholder="Rechercher par libellé…"
  dockSearch
  hasFilters={true}
  filtersActive={isFilterActive}
  activeFilters={criteres}
  onSearchSubmit={(val) => naviguer({ search: val || null })}
  onSearchClear={() => naviguer({ search: null })}
  onOpenFilters={() => (filtresOuverts = true)}
>
  {#snippet filters()}
    <h4 class="border-b border-border pb-2 text-sm font-semibold">Options de filtrage</h4>
    <div class="space-y-3 pt-2">
      {@render criteresDeListe()}
    </div>
  {/snippet}

  {#snippet actions()}
    <!-- Sur téléphone, ces actions vivent dans la barre du bas. -->
    {#if !isClosed}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} class="hidden h-9 gap-2 md:inline-flex">
              Nouvelle écriture
              <ChevronDown class="h-4 w-4" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onclick={() => onOpenPanel('recette')} class="cursor-pointer text-success">
            Saisir une recette
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => onOpenPanel('depense')} class="cursor-pointer text-destructive">
            Saisir une dépense
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => onOpenPanel('transfert')} class="cursor-pointer">
            Virement interne
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
    {#if exportHref}
      <Button href={exportHref} variant="secondary" target="_blank" download class="hidden h-9 gap-2 md:inline-flex">
        <Download class="h-4 w-4" />
        Exporter (CSV)
      </Button>
    {/if}
  {/snippet}
</DataTableToolbar>

<FilterSheet
  bind:open={filtresOuverts}
  description="Ces critères s'ajoutent à la recherche."
  {resultCount}
  itemName="écriture"
  hasActiveFilters={isFilterActive}
  onReset={() => {
    filtresOuverts = false;
    naviguer(effacementTotal());
  }}
>
  <div class="space-y-3">
    {@render criteresDeListe()}
  </div>
</FilterSheet>
