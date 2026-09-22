<script lang="ts">
  import { Search, Sparkles, Upload, X } from '@lucide/svelte';
  import {
    Button,
    ChoiceField,
    FilterSheet,
    FormField,
    Input,
    dockDePage,
    softNavigate,
    toSeasonOptions,
    type SwipeAction
  } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  /**
   * Ce qui réduit la file : la recherche, et le compte sur lequel on rapproche.
   *
   * Un rapprochement se pose compte par compte — c'est l'unité sur laquelle l'état
   * vérifie son identité — et le filtre ne s'affiche que s'il y a matière à trancher.
   *
   * Au doigt, les deux descendent dans la barre du bas : posés en tête de la file, ils
   * défilaient hors de vue dès la troisième opération, et le sélecteur de compte tenait
   * dans 128 px où aucun libellé n'était lisible.
   */
  let {
    state: reconState = $bindable(),
    searchInput = $bindable(null),
    compact = false
  }: {
    state: ReconciliationState;
    /** Le champ, pour que le raccourci « / » lui donne le focus. */
    searchInput?: HTMLInputElement | null;
    /**
     * Aucune file à réduire : ne restent que l'exercice et les deux actions.
     *
     * Le cas du relevé vide. L'exercice doit y rester atteignable — c'est même là qu'on
     * veut aller consulter l'archive d'un autre — mais une recherche et un filtre de
     * compte posés au-dessus d'un « importez votre relevé » ne réduisent rien.
     */
    compact?: boolean;
  } = $props();

  let filtresOuverts = $state(false);

  const comptes = $derived([
    { value: '', label: `Tous les comptes (${reconState.pendingCount})` },
    ...reconState.accountOptions.map((a) => ({ value: a.id, label: `${a.label} (${a.pendingCount})` }))
  ]);

  /*
    L'exercice réduit ce qu'on voit : il rejoint donc les critères, derrière la loupe, et
    non une barre d'en-tête. Il sert à **consulter** — l'archive d'un exercice clos, son
    état de rapprochement, son écart — jamais à rapprocher : une ligne non rapprochée
    n'appartient à aucun exercice, et celui d'une écriture se choisit ligne par ligne.
  */
  const saisons = $derived(
    toSeasonOptions(reconState.seasons ?? []).map((s) => ({ value: String(s.value), label: s.label }))
  );

  const filtreActif = $derived(!!reconState.accountFilter);

  /*
    La recherche s'applique à la frappe — la file se réduit sous les doigts, sans
    validation — d'où le `onSubmit` qui écrit simplement dans l'état.
  */
  /*
    Import et analyse descendent dans la barre du bas : ce sont les deux actions de cet
    écran, et elles vivaient au-dessus d'une file qu'on fait défiler.
  */
  $effect(() => {
    const actions: SwipeAction[] = [
      {
        id: 'import',
        label: 'Importer un relevé (OFX)',
        icon: Upload,
        run: () => {
          if (!reconState.isClosed) reconState.showImportModal = true;
        }
      }
    ];
    if (!reconState.isClosed && reconState.pendingCount > 0) {
      actions.push({
        id: 'analyse',
        label: reconState.isAnalyzing ? 'Analyse en cours…' : 'Analyse IA',
        icon: Sparkles,
        run: () => reconState.handleAnalyze()
      });
    }
    return dockDePage.declarerActions(actions);
  });

  $effect(() => {
    if (compact) return;
    return dockDePage.declarerRecherche({
      placeholder: 'Rechercher une opération…',
      valeur: reconState.searchQuery,
      onSubmit: (valeur) => (reconState.searchQuery = valeur),
      /* Chercher et filtrer sont la même intention : réduire la file. */
      filtres: { actif: filtreActif, ouvrir: () => (filtresOuverts = true) }
    });
  });
</script>

<!-- Au-dessus de 768 px, les deux contrôles restent en tête de la file. -->
<div class="hidden items-center gap-2 md:flex">
  {#if !compact}
  <div class="relative min-w-0 flex-1">
    <!--
      Aucune hauteur imposée : `Input` et le champ de choix portent tous deux `h-11 sm:h-8`,
      soit la cible tactile de 44 px sur mobile. La loupe passe par la prop `icon` du
      composant : posée en absolu, elle chevauchait le texte.
    -->
    <Input
      type="text"
      icon={Search}
      placeholder="Rechercher une opération…"
      bind:value={reconState.searchQuery}
      bind:ref={searchInput}
      class="text-xs !pr-8"
    />
    {#if reconState.searchQuery}
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onclick={() => (reconState.searchQuery = '')}
      >
        <X class="h-3.5 w-3.5" />
        <span class="sr-only">Effacer la recherche</span>
      </button>
    {/if}
  </div>

  {/if}

  {#if !compact && !reconState.isSingleAccount}
    <div class="w-52 shrink-0">
      <ChoiceField
        id="recon-account-desktop"
        label="Compte"
        options={comptes}
        bind:value={reconState.accountFilter}
      />
    </div>
  {/if}

  <div class="w-44 shrink-0">
    <ChoiceField
      id="recon-season-desktop"
      label="Exercice"
      options={saisons}
      value={reconState.selectedSeason}
      onChange={(v) => softNavigate(`/admin/accounting/reconciliation?season=${encodeURIComponent(v)}`)}
    />
  </div>

  <Button
    variant="outline"
    class="hidden h-9 shrink-0 gap-2 md:inline-flex"
    disabled={reconState.isClosed}
    onclick={() => (reconState.showImportModal = true)}
  >
    <Upload class="h-4 w-4" />
    Importer (OFX)
  </Button>

  <Button
    variant="ai"
    class="hidden h-9 shrink-0 gap-2 md:inline-flex"
    disabled={reconState.isClosed || reconState.isAnalyzing || reconState.pendingCount === 0}
    onclick={() => reconState.handleAnalyze()}
  >
    <Sparkles class="h-4 w-4" />
    {reconState.isAnalyzing ? 'Analyse…' : 'Analyse IA'}
  </Button>
</div>

<!-- Le jeton dit le compte retenu, et le défait d'un appui. -->
{#if filtreActif && !compact}
  <div class="flex flex-wrap items-center gap-2 md:hidden">
    <button
      type="button"
      onclick={() => (reconState.accountFilter = '')}
      class="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-accent px-3 text-sm text-accent-foreground"
    >
      <span class="truncate">
        {comptes.find((c) => c.value === reconState.accountFilter)?.label ?? 'Compte'}
      </span>
      <X class="size-4 shrink-0" />
      <span class="sr-only">Retirer ce filtre</span>
    </button>
  </div>
{/if}

<FilterSheet
    bind:open={filtresOuverts}
    description="Un rapprochement se pose compte par compte."
    resultCount={reconState.pendingCount}
    itemName="opération"
    hasActiveFilters={filtreActif}
    onReset={() => {
      reconState.accountFilter = '';
      filtresOuverts = false;
    }}
  >
    <FormField id="recon-account" label="Compte">
      <ChoiceField id="recon-account" label="Compte" options={comptes} bind:value={reconState.accountFilter} />
    </FormField>

    <FormField id="recon-season" label="Exercice">
      <ChoiceField
        id="recon-season"
        label="Exercice"
        options={saisons}
        value={reconState.selectedSeason}
        onChange={(v) => softNavigate(`/admin/accounting/reconciliation?season=${encodeURIComponent(v)}`)}
      />
    </FormField>
</FilterSheet>
