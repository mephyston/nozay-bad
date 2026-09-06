<script lang="ts">
  import { CheckCircle, MoreVertical, FileText, Trash2 } from '@lucide/svelte';
  import { Button, Badge, Amount, DropdownMenu, DataTable, Table, DataTableToolbar, FormField, SearchableCombobox, softNavigate, toSeasonOptions } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';
  import type { CheckDeposit } from './check-deposit-types';

  import type { Snippet } from 'svelte';

  interface Props {
    depositState: CheckDepositState;
    seasonId: string;
    seasons: any[];
    checkDeposits: CheckDeposit[];
    onDeleteDeposit: (id: number) => Promise<void>;
    tabsNav?: Snippet;
  }

  let { depositState, seasonId, seasons, checkDeposits, onDeleteDeposit, tabsNav }: Props = $props();

  let depositSearchQuery = $state('');

  const filteredDeposits = $derived.by(() => {
    if (!depositSearchQuery) return checkDeposits;
    const q = depositSearchQuery.toLowerCase();
    return checkDeposits.filter(d => d.reference.toLowerCase().includes(q));
  });
</script>

<DataTable
  data={filteredDeposits}
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
      searchPlaceholder="Rechercher par référence..."
      hasFilters={true}
      filtersActive={!!seasonId && seasons.length > 0}
    >
      {#snippet filters()}
          <FormField id="filter-season" label="Saison">
          <SearchableCombobox
            id="filter-season"
            items={seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]}
            value={seasonId}
            onValueChange={(v) => { const val = String(v); const params = new URLSearchParams(window.location.search); params.set('season', val); softNavigate(`/admin/accounting/cheques?${params.toString()}`); }}
          />
        </FormField>
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

  {#snippet row(dep)}
    <Table.Row class="hover:bg-muted/50 transition-colors">
      <Table.Cell class="hidden md:table-cell text-muted-foreground">
      {new Date(dep.date).toLocaleDateString('fr-FR')}
    </Table.Cell>
    <Table.Cell class="font-medium">{dep.reference}</Table.Cell>
    <Table.Cell>
      {#if dep.status === 'cleared'}
        <Badge variant="success">
          <CheckCircle class="h-3 w-3" /> Rapproché
        </Badge>
      {:else}
        <Badge variant="info">
          Déposé
        </Badge>
      {/if}
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          {#snippet child({ props })}
            <Button 
              {...props}
              variant="ghost"
              size="icon"
              class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
              aria-label="Actions"
            >
              <MoreVertical class="w-4 h-4" />
              <span class="sr-only">Toggle menu</span>
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>

        <DropdownMenu.Content class="w-48" align="end">
          <DropdownMenu.Item
            onclick={() => window.open(`/admin/accounting/cheques/deposits/${dep.id}`, '_blank')}
            class="cursor-pointer"
          >
            <FileText class="w-3.5 h-3.5 mr-2" />
            Consulter / Imprimer
          </DropdownMenu.Item>
          
          {#if dep.status !== 'cleared' && !depositState.isClosed}
            <DropdownMenu.Item
              onclick={() => {
                depositState.selectedDepositToClear = dep;
                depositState.showClearModal = true;
              }}
              class="text-primary focus:text-primary cursor-pointer"
            >
              <CheckCircle class="w-3.5 h-3.5 mr-2" />
              Rapprocher (SG)
            </DropdownMenu.Item>
          {/if}

          {#if !depositState.isClosed}
            <DropdownMenu.Item
              onclick={() => onDeleteDeposit(dep.id)}
              class="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5 mr-2" />
              Supprimer la remise
            </DropdownMenu.Item>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
