<script lang="ts">
  import { CheckCircle } from '@lucide/svelte';
  import {
    Badge,
    Amount,
    ChoiceField,
    DataTable,
    DataTableRowActions,
    DropdownMenu,
    FilterSheet,
    FormField,
    RowActionItems,
    Table,
    DataTableToolbar,
    softNavigate,
    openDocument,
    toSeasonOptions
  } from '@nba/ui';
  import DepositsList from './DepositsList.svelte';
  import { gestesDeRemise, statutDeRemise } from './checks-row-model';
  import type { CheckDepositState } from './check-deposit-state.svelte';
  import type { CheckDeposit } from './check-deposit-types';

  import type { Snippet } from 'svelte';

  interface Props {
    depositState: CheckDepositState;
    seasonId: string;
    seasons: any[];
    checkDeposits: CheckDeposit[];
    onDeleteDeposit: (id: number) => Promise<void>;
    onConfirmDeposit: (id: number) => Promise<void>;
    tabsNav?: Snippet;
  }

  let { depositState, seasonId, seasons, checkDeposits, onDeleteDeposit, onConfirmDeposit, tabsNav }: Props = $props();

  let depositSearchQuery = $state('');
  let filtresOuverts = $state(false);

  const seasonItems = $derived(
    (seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]).map(
      (o) => ({ value: String(o.value), label: o.label })
    )
  );

  function changerSaison(code: string) {
    /* On reste sur l'écran courant : `/cheques` est le hub qui mène aux deux tableaux. */
    const params = new URLSearchParams(window.location.search);
    params.set('season', code);
    softNavigate(`${window.location.pathname}?${params.toString()}`);
  }

  /** Les gestes d'un bordereau, déclarés une fois pour la table comme pour la liste. */
  const gestes = $derived({
    isClosed: depositState.isClosed,
    onConsulter: (dep: CheckDeposit) => openDocument(`/admin/accounting/cheques/deposits/${dep.id}`),
    onConfirmer: onConfirmDeposit,
    onEncaisser: (dep: CheckDeposit) => {
      depositState.selectedDepositToClear = dep;
      depositState.showClearModal = true;
    },
    onSupprimer: onDeleteDeposit
  });

  const filteredDeposits = $derived.by(() => {
    if (!depositSearchQuery) return checkDeposits;
    const q = depositSearchQuery.toLowerCase();
    return checkDeposits.filter(d => d.reference.toLowerCase().includes(q));
  });
</script>

<!-- Le statut et le menu d'une remise, partagés par la table et la carte mobile. -->
{#snippet status(dep: CheckDeposit)}
  {@const st = statutDeRemise(dep)}
  <Badge variant={st.variant as 'success'}>
    {#if dep.status === 'cleared'}<CheckCircle class="h-3 w-3" />{/if}
    {st.label}
  </Badge>
{/snippet}

{#snippet actions(dep: CheckDeposit)}
  {@const liste = gestesDeRemise(dep, gestes)}
  <DataTableRowActions>
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    <RowActionItems actions={liste} item={dep} />
  </DataTableRowActions>
{/snippet}

{#snippet criteresDeListe()}
  <FormField id="filter-season-deposits" label="Saison">
    <ChoiceField
      id="filter-season-deposits"
      label="Saison"
      options={seasonItems}
      value={seasonId}
      onChange={changerSaison}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="La saison fixe le périmètre des bordereaux."
  resultCount={filteredDeposits.length}
  itemName="bordereau"
  itemNamePlural="bordereaux"
>
  {@render criteresDeListe()}
</FilterSheet>

<DataTable
  data={filteredDeposits}
  mobileSpacing="list"
  emptyTitle="Aucun bordereau"
  emptyDescription="Aucun bordereau de remise enregistré."
>
  {#snippet toolbarStart()}
    {#if tabsNav}
      {@render tabsNav()}
    {/if}
  {/snippet}
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={depositSearchQuery}
      searchPlaceholder="Rechercher un bordereau (référence…)"
      dockSearch={depositState.activeTab === 'deposits'}
      hasFilters={true}
      filtersActive={false}
      onOpenFilters={() => (filtresOuverts = true)}
    >
      {#snippet filters()}
        <div class="space-y-4">
          {@render criteresDeListe()}
        </div>
      {/snippet}
    </DataTableToolbar>
  {/snippet}
  {#snippet header()}
    <Table.Head class="hidden md:table-cell">Date de dépôt</Table.Head>
    <Table.Head>Référence</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head class="text-right">Montant Total</Table.Head>
    <Table.Head class="hidden md:table-cell">Rapprochement Bancaire</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet mobileView()}
    <DepositsList deposits={filteredDeposits} {...gestes} />
  {/snippet}

  {#snippet row(dep)}
    <Table.Row class="hover:bg-muted/50 transition-colors">
      <Table.Cell class="hidden md:table-cell text-muted-foreground">
      {new Date(dep.date).toLocaleDateString('fr-FR')}
    </Table.Cell>
    <Table.Cell class="font-medium">{dep.reference}</Table.Cell>
    <Table.Cell>
      {@render status(dep)}
    </Table.Cell>
    <Table.Cell class="text-right font-bold text-foreground">
      <Amount cents={(dep as any).amountCents ?? dep.amount} />
    </Table.Cell>
    <Table.Cell class="hidden md:table-cell">
      {#if dep.status === 'cleared'}
        <span class="text-xs text-success font-semibold flex items-center gap-1">
          <CheckCircle class="w-3.5 h-3.5" />
          Rapproché (SG #{dep.bankStatementLineId})
        </span>
      {:else}
        <span class="text-xs text-muted-foreground italic font-medium">Non rapproché</span>
      {/if}
    </Table.Cell>
    <Table.Cell class="text-right">
      {@render actions(dep)}
    </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
