<script lang="ts">
  import { Search, X } from '@lucide/svelte';
  import { ChoiceField, FilterSheet, FormField, Input, dockDePage } from '@nba/ui';
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
    searchInput = $bindable(null)
  }: {
    state: ReconciliationState;
    /** Le champ, pour que le raccourci « / » lui donne le focus. */
    searchInput?: HTMLInputElement | null;
  } = $props();

  let filtresOuverts = $state(false);

  const comptes = $derived([
    { value: '', label: `Tous les comptes (${reconState.pendingCount})` },
    ...reconState.accountOptions.map((a) => ({ value: a.id, label: `${a.label} (${a.pendingCount})` }))
  ]);

  const filtreActif = $derived(!!reconState.accountFilter);

  /*
    La recherche s'applique à la frappe — la file se réduit sous les doigts, sans
    validation — d'où le `onSubmit` qui écrit simplement dans l'état.
  */
  $effect(() =>
    dockDePage.declarerRecherche({
      placeholder: 'Rechercher une opération…',
      valeur: reconState.searchQuery,
      onSubmit: (valeur) => (reconState.searchQuery = valeur),
      filtres: reconState.isSingleAccount
        ? undefined
        : { actif: filtreActif, ouvrir: () => (filtresOuverts = true) }
    })
  );
</script>

<!-- Au-dessus de 768 px, les deux contrôles restent en tête de la file. -->
<div class="hidden items-center gap-2 md:flex">
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

  {#if !reconState.isSingleAccount}
    <div class="w-52 shrink-0">
      <ChoiceField
        id="recon-account-desktop"
        label="Compte"
        options={comptes}
        bind:value={reconState.accountFilter}
      />
    </div>
  {/if}
</div>

<!-- Le jeton dit le compte retenu, et le défait d'un appui. -->
{#if filtreActif}
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

<!-- Rien à trancher quand le club n'a qu'un compte : pas de feuille, pas de choix. -->
{#if !reconState.isSingleAccount}
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
  </FilterSheet>
{/if}
