<script lang="ts">
  import { Search, Link, MoreHorizontal, Trash2, FileText, Camera } from '@lucide/svelte';
  import { Button, Input, Checkbox, Amount, DropdownMenu, DataTable, Table, DataTableToolbar, FormField, SearchableCombobox } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';

  interface Props {
    depositState: CheckDepositState;
    seasonId: string;
    seasons: any[];
    onDeleteCheck: (id: number) => Promise<void>;
    tabsNav?: Snippet;
  }

  let { depositState, seasonId, seasons, onDeleteCheck, tabsNav }: Props = $props();

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new-cheque' && !depositState.isClosed) {
      depositState.showAddCheckModal = true;
    }
  });
</script>

<DataTable
  data={depositState.filteredChecks}
  emptyTitle="Aucun chèque"
  emptyDescription="Aucun chèque en attente pour cette saison."
>
  {#snippet toolbarStart()}
    {#if tabsNav}
      {@render tabsNav()}
    {/if}
  {/snippet}
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={depositState.checkSearchQuery}
      searchPlaceholder="Rechercher par numéro, émetteur, banque, adhérent..."
      hasFilters={true}
      filtersActive={!!seasonId && seasons.length > 0}
    >
      {#snippet filters()}
          <FormField id="filter-season" label="Saison">
          <SearchableCombobox
            id="filter-season"
            items={seasons.length > 0 ? seasons.map((s) => ({ label: s.name, value: String(s.code || s.id) })) : [{ label: 'Saison 2025-2026', value: '25-26' }]}
            value={seasonId}
            onValueChange={(v) => { const val = String(v); const params = new URLSearchParams(window.location.search); params.set('season', val); window.location.href = `/admin/accounting/cheques?${params.toString()}`; }}
          />
        </FormField>
      {/snippet}
      {#snippet actions()}
        {#if !depositState.isClosed}
          <div class="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
            <Button
              onclick={() => depositState.showAddCheckModal = true}
              class="flex items-center justify-center gap-2 h-9 w-full sm:w-auto"
            >
              <Camera class="h-4 w-4" />
              Enregistrer un chèque
            </Button>

            {#if depositState.selectedChecksList.length > 0}
              <Button
                onclick={() => depositState.showCreateDepositModal = true}
                class="flex items-center justify-center gap-2 h-9 w-full sm:w-auto bg-success/10 hover:bg-success/10 text-white animate-pulse"
              >
                <FileText class="h-4 w-4" />
                Remise de {depositState.selectedChecksList.length} chèque(s) ({(depositState.totalSelectedAmount / 100).toFixed(2)} €)
              </Button>
            {/if}
          </div>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}
  {#snippet header()}
    <Table.Head class="w-10">
      <Checkbox
        checked={depositState.filteredChecks.length > 0 && depositState.filteredChecks.every(c => depositState.selectedCheckIds[c.id])}
        onCheckedChange={(val) => {
          const checked = !!val;
          depositState.filteredChecks.forEach(c => depositState.selectedCheckIds[c.id] = checked);
        }}
        disabled={depositState.isClosed}
      />
    </Table.Head>
    <Table.Head class="hidden md:table-cell">Date</Table.Head>
    <Table.Head>N° Chèque</Table.Head>
    <Table.Head class="hidden md:table-cell">Banque</Table.Head>
    <Table.Head>Émetteur</Table.Head>
    <Table.Head class="hidden lg:table-cell">Adhérent</Table.Head>
    <Table.Head class="text-right">Montant</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(check)}
    <Table.Row>
      <Table.Cell>
        <Checkbox
          checked={!!depositState.selectedCheckIds[check.id]}
          onCheckedChange={(val) => {
            depositState.selectedCheckIds[check.id] = !!val;
          }}
          disabled={depositState.isClosed}
        />
      </Table.Cell>
      <Table.Cell class="hidden md:table-cell text-muted-foreground">
        {new Date(check.createdAt).toLocaleDateString('fr-FR')}
      </Table.Cell>
      <Table.Cell class="font-medium">{check.number}</Table.Cell>
      <Table.Cell class="hidden md:table-cell">{check.bank || '—'}</Table.Cell>
      <Table.Cell class="font-medium">{check.emitter}</Table.Cell>
      <Table.Cell class="hidden lg:table-cell">
        {#if check.memberId && check.memberName}
          <a
            href={`/admin/members/${check.memberLicence}?season=${seasonId}`}
            class="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
          >
            <Link class="h-3 w-3" />
            {check.memberName}
          </a>
        {:else}
          <span class="text-xs text-muted-foreground italic">Non associé</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-right font-bold text-foreground">
        <Amount cents={(check as any).amountCents ?? check.amount} />
      </Table.Cell>
      <Table.Cell class="text-right">
        {#if !depositState.isClosed}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              {#snippet child({ props })}
                <Button 
                  {...props}
                  aria-haspopup="true"
                  size="icon"
                  variant="ghost"
                >
                  <MoreHorizontal class="h-4 w-4" />
                  <span class="sr-only">Toggle menu</span>
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>

            <DropdownMenu.Content align="end">
              <DropdownMenu.Label>Actions</DropdownMenu.Label>
              <DropdownMenu.Item
                onclick={() => onDeleteCheck(check.id)}
                class="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5 mr-2" />
                Supprimer
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {:else}
          <span class="text-xs text-muted-foreground italic">Aucune</span>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
