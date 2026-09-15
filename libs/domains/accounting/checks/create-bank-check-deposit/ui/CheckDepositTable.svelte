<script lang="ts">
  import { Link, MoreHorizontal, Pencil, Trash2, FileText, Camera } from '@lucide/svelte';
  import { Badge, Button, Checkbox, Amount, DropdownMenu, DataTable, Table, DataTableToolbar, FormField, SearchableCombobox, Card, softNavigate, toSeasonOptions } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';
  import type { Check } from './check-deposit-types';
  import { depositMonthLabel } from '../../../shared/deposit-month';

  import type { Snippet } from 'svelte';

  interface Props {
    depositState: CheckDepositState;
    seasonId: string;
    seasons: any[];
    onEditCheck: (check: Check) => void;
    onDeleteCheck: (id: number) => Promise<void>;
    tabsNav?: Snippet;
  }

  let { depositState, seasonId, seasons, onEditCheck, onDeleteCheck, tabsNav }: Props = $props();
</script>

<!-- Le menu d'une ligne, partagé par la table et la carte mobile : un seul endroit à tenir. -->
{#snippet actions(check: Check)}
  {#if !depositState.isClosed && !check.checkDepositId}
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
          <DropdownMenu.Item onclick={() => onEditCheck(check)} class="cursor-pointer">
            <Pencil class="w-3.5 h-3.5 mr-2" />
            Modifier
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => onDeleteCheck(check.id)}
            class="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 class="w-3.5 h-3.5 mr-2" />
            Supprimer
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {:else if check.checkDepositId}
      <span class="text-xs text-muted-foreground italic">Via le bordereau</span>
    {:else}
      <span class="text-xs text-muted-foreground italic">Aucune</span>
    {/if}
{/snippet}

{#snippet member(check: Check)}
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
{/snippet}

<DataTable
  data={depositState.filteredChecks}
  mobileSpacing="spaced"
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
            items={seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]}
            value={seasonId}
            onValueChange={(v) => {
              // On reste sur l'écran courant : `/cheques` est le hub qui mène aux deux tableaux,
              // pas l'un d'eux — y renvoyer faisait perdre le tableau qu'on venait de filtrer.
              const params = new URLSearchParams(window.location.search);
              params.set('season', String(v));
              softNavigate(`${window.location.pathname}?${params.toString()}`);
            }}
          />
        </FormField>
      {/snippet}
      {#snippet actions()}
        {#if !depositState.isClosed}
          <div class="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
            <Button
              onclick={() => depositState.openCreateCheck()}
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
        checked={depositState.depositableChecks.length > 0 && depositState.depositableChecks.every(c => depositState.selectedCheckIds[c.id])}
        onCheckedChange={(val) => {
          const checked = !!val;
          depositState.depositableChecks.forEach(c => depositState.selectedCheckIds[c.id] = checked);
        }}
        disabled={depositState.isClosed}
      />
    </Table.Head>
    <Table.Head>Remise prévue</Table.Head>
    <Table.Head class="hidden md:table-cell">Date</Table.Head>
    <Table.Head>N° Chèque</Table.Head>
    <Table.Head class="hidden md:table-cell">Banque</Table.Head>
    <Table.Head>Émetteur</Table.Head>
    <Table.Head class="hidden lg:table-cell">Adhérent</Table.Head>
    <Table.Head class="text-right">Montant</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet mobileView()}
    <!--
      À la largeur d'un téléphone, la table débordait : le montant et les actions — ce pour quoi on
      ouvre l'écran — n'étaient atteignables qu'en faisant défiler chaque ligne de côté. Une carte
      par chèque, avec sa case de sélection : la remise se prépare aussi depuis le téléphone.
    -->
    {#each depositState.filteredChecks as check (check.id)}
      <Card.Root size="sm" class="py-0">
        <Card.Content class="p-3">
          <div class="flex items-start gap-3">
            <Checkbox
              class="mt-1"
              checked={!!depositState.selectedCheckIds[check.id]}
              onCheckedChange={(val) => {
                depositState.selectedCheckIds[check.id] = !!val;
              }}
              disabled={depositState.isClosed || !!check.checkDepositId}
              aria-label={`Sélectionner le chèque ${check.number}`}
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="line-clamp-2 break-words text-sm font-semibold text-foreground" title={check.emitter}>{check.emitter}</div>
                  <div class="text-xs text-muted-foreground">
                    N° {check.number}{check.bank ? ` · ${check.bank}` : ''}
                    · {new Date(check.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Amount cents={(check as any).amountCents ?? check.amount} class="shrink-0 text-base font-bold text-foreground" />
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                {#if check.plannedDepositMonth}
                  <Badge variant="secondary" size="xs">{depositMonthLabel(check.plannedDepositMonth)}</Badge>
                {:else}
                  <span class="text-xs text-muted-foreground italic">Dès que possible</span>
                {/if}
                {#if check.checkDepositId}
                  <Badge variant="warning" size="xs">Remise à déposer</Badge>
                {/if}
                {@render member(check)}
              </div>
            </div>
            <div class="-mr-2 -mt-1 shrink-0">
              {@render actions(check)}
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
  {/snippet}

  {#snippet row(check)}
    <Table.Row>
      <Table.Cell>
        <Checkbox
          checked={!!depositState.selectedCheckIds[check.id]}
          onCheckedChange={(val) => {
            depositState.selectedCheckIds[check.id] = !!val;
          }}
          disabled={depositState.isClosed || !!check.checkDepositId}
        />
      </Table.Cell>
      <Table.Cell>
        {#if check.plannedDepositMonth}
          <Badge variant="secondary" size="xs">{depositMonthLabel(check.plannedDepositMonth)}</Badge>
        {:else}
          <span class="text-xs text-muted-foreground italic">Dès que possible</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="hidden md:table-cell text-muted-foreground">
        {new Date(check.createdAt).toLocaleDateString('fr-FR')}
      </Table.Cell>
      <Table.Cell class="font-medium">
        {check.number}
        {#if check.checkDepositId}
          <!-- Toujours au coffre, mais déjà inscrit sur un bordereau qui attend d'être déposé. -->
          <Badge variant="warning" size="xs" class="ml-2">Remise à déposer</Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="hidden md:table-cell">{check.bank || '—'}</Table.Cell>
      <Table.Cell class="font-medium">{check.emitter}</Table.Cell>
      <Table.Cell class="hidden lg:table-cell">
        {@render member(check)}
      </Table.Cell>
      <Table.Cell class="text-right font-bold text-foreground">
        <Amount cents={(check as any).amountCents ?? check.amount} />
      </Table.Cell>
      <Table.Cell class="text-right">
        {@render actions(check)}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
