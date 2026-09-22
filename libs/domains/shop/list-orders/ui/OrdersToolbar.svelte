<script lang="ts">
  import { Plus } from '@lucide/svelte';
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
  import type { OrdersTab, Season } from './orders-manager-types';

  /**
   * La barre d'outils de l'écran des commandes, et ses critères.
   *
   * Les deux tables la partageaient déjà par snippets interposés, chacune
   * réinstallant sa propre `DataTableToolbar` ; elle vit désormais ici, une fois.
   *
   * **Tout ce qui réduit la liste est derrière la loupe, et nulle part ailleurs** :
   * la saison, qui fixe le périmètre, et la vue, qui choisit l'étape. Ce qui reste
   * au-dessus de la liste ne règle rien — ce sont les jetons, qui disent ce qui est
   * appliqué et permettent de le défaire d'un appui.
   */
  let {
    searchTerm = $bindable(''),
    selectedSeason = $bindable(''),
    activeTab = $bindable('open'),
    seasons = [],
    counts,
    resultCount = 0,
    canCreate = false,
    onCreate
  }: {
    searchTerm?: string;
    selectedSeason?: string;
    activeTab?: OrdersTab;
    seasons?: Season[];
    /** Le compte de chaque vue, affiché dans le choix comme dans les jetons. */
    counts: { open: number; created: number; awaiting_payment: number; history: number };
    /** Ce que la vue en cours affiche, pour le bouton de la feuille de filtres. */
    resultCount?: number;
    canCreate?: boolean;
    onCreate?: () => void;
  } = $props();

  let filtresOuverts = $state(false);

  const seasonItems = $derived(
    seasons.length > 0
      ? toSeasonOptions(seasons, { markClosed: true })
      : [{ label: 'Saison 2025-2026', value: '25-26' }]
  );

  /*
    La vue réunie est le défaut : elle montre d'un coup ce qui attend une décision et
    ce qui attend un règlement. Les trois autres sont des restrictions, et c'est à ce
    titre qu'elles se signalent par un jeton.
  */
  const VUES: { value: OrdersTab; label: string }[] = [
    { value: 'open', label: 'En cours' },
    { value: 'created', label: 'À valider' },
    { value: 'awaiting_payment', label: 'En attente de paiement' },
    { value: 'history', label: 'Historique' }
  ];

  const vueItems = $derived(
    VUES.map((v) => ({ value: v.value, label: `${v.label} (${counts[v.value]})` }))
  );

  const libelleDeVue = (vue: OrdersTab) => VUES.find((v) => v.value === vue)?.label ?? vue;

  /*
    `ChoiceField` travaille sur des chaînes libres ; la vue, elle, est une union
    fermée. Le miroir évite de lier une union à un `string` — un aller-retour de
    liaison y ferait rentrer n'importe quelle chaîne, et rien dans la chaîne d'outils
    ne le dirait : `astro check` ne lit pas les .svelte des bibliothèques de domaine.
  */
  let vueChoisie = $state<string>(activeTab);
  $effect(() => {
    vueChoisie = activeTab;
  });

  const isFilterActive = $derived(activeTab !== 'open');

  const criteres = $derived(
    isFilterActive
      ? [
          {
            id: 'vue',
            label: libelleDeVue(activeTab),
            onRemove: () => {
              activeTab = 'open';
            }
          }
        ]
      : []
  );

  /*
    Créer une commande descend dans la barre du bas : c'est la seule action de cet
    écran, et elle vivait en haut d'une barre d'outils qui défile hors de l'écran dès
    qu'on parcourt la liste.
  */
  $effect(() => {
    if (!canCreate || !onCreate) return;
    const actions: SwipeAction[] = [
      { id: 'creer-commande', label: 'Créer une commande', icon: Plus, run: onCreate }
    ];
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
    />
  </FormField>

  <FormField id="filter-view" label="Vue">
    <ChoiceField
      id="filter-view"
      label="Vue"
      options={vueItems}
      bind:value={vueChoisie}
      onChange={(v) => (activeTab = v as OrdersTab)}
    />
  </FormField>
{/snippet}

<DataTableToolbar
  bind:searchValue={searchTerm}
  searchPlaceholder="Rechercher une commande (adhérent, article…)"
  dockSearch
  hasFilters={true}
  filtersActive={isFilterActive}
  activeFilters={criteres}
  onOpenFilters={() => (filtresOuverts = true)}
>
  {#snippet filters()}
    <h4 class="border-b border-border pb-2 text-sm font-semibold">Options de filtrage</h4>
    <div class="space-y-3 pt-2">
      {@render criteresDeListe()}
    </div>
  {/snippet}

  {#snippet actions()}
    <!-- Sur téléphone, cette action vit dans la barre du bas. -->
    {#if canCreate && onCreate}
      <Button onclick={onCreate} class="hidden h-9 gap-2 md:inline-flex">
        <Plus class="h-4 w-4" />
        Créer une commande
      </Button>
    {/if}
  {/snippet}
</DataTableToolbar>

<FilterSheet
  bind:open={filtresOuverts}
  description="Ces critères s'ajoutent à la recherche."
  {resultCount}
  itemName="commande"
  hasActiveFilters={isFilterActive}
  onReset={() => {
    activeTab = 'open';
    filtresOuverts = false;
  }}
>
  <div class="space-y-3">
    {@render criteresDeListe()}
  </div>
</FilterSheet>
