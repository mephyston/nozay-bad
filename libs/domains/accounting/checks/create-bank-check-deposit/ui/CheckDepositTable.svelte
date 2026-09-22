<script lang="ts">
  import { Link, FileText, Camera } from '@lucide/svelte';
  import {
    Badge,
    Button,
    Checkbox,
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
    dockDePage,
    softNavigate,
    toSeasonOptions,
    type SwipeAction
  } from '@nba/ui';
  import ChecksList from './ChecksList.svelte';
  import { gestesDeCheque } from './checks-row-model';
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

  let filtresOuverts = $state(false);

  const seasonItems = $derived(
    (seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]).map(
      (o) => ({ value: String(o.value), label: o.label })
    )
  );

  function changerSaison(code: string) {
    /* On reste sur l'écran courant : `/cheques` est le hub qui mène aux deux tableaux,
       pas l'un d'eux — y renvoyer faisait perdre le tableau qu'on venait de filtrer. */
    const params = new URLSearchParams(window.location.search);
    params.set('season', code);
    softNavigate(`${window.location.pathname}?${params.toString()}`);
  }

  /*
    Enregistrer un chèque descend dans la barre du bas, et la remise l'y rejoint dès
    qu'un chèque est retenu : c'est l'aboutissement de l'écran, et il vivait dans un
    bouton clignotant en haut d'une barre d'outils qui défile.
  */
  $effect(() => {
    if (depositState.activeTab !== 'checks' || depositState.isClosed) return;
    const actions: SwipeAction[] = [
      { id: 'cheque', label: 'Enregistrer un chèque', icon: Camera, run: () => depositState.openCreateCheck() }
    ];
    if (depositState.selectedChecksList.length > 0) {
      const n = depositState.selectedChecksList.length;
      actions.unshift({
        id: 'remise',
        label: `Remise de ${n} chèque${n > 1 ? 's' : ''}`,
        icon: FileText,
        run: () => (depositState.showCreateDepositModal = true)
      });
    }
    return dockDePage.declarerActions(actions);
  });

</script>

<!-- Le menu d'une ligne, partagé par la table et la carte mobile : un seul endroit à tenir. -->
{#snippet actions(check: Check)}
  {@const gestes = gestesDeCheque(check, { isClosed: depositState.isClosed, onEdit: onEditCheck, onDelete: onDeleteCheck })}
  {#if gestes.length > 0}
    <DataTableRowActions>
      <DropdownMenu.Label>Actions</DropdownMenu.Label>
      <RowActionItems actions={gestes} item={check} />
    </DataTableRowActions>
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

{#snippet criteresDeListe()}
  <FormField id="filter-season" label="Saison">
    <ChoiceField
      id="filter-season"
      label="Saison"
      options={seasonItems}
      value={seasonId}
      onChange={changerSaison}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="La saison fixe le périmètre du tiroir."
  resultCount={depositState.filteredChecks.length}
  itemName="chèque"
>
  {@render criteresDeListe()}
</FilterSheet>

<DataTable
  data={depositState.filteredChecks}
  mobileSpacing="list"
  emptyTitle="Aucun chèque"
  emptyDescription="Aucun chèque en attente pour cette saison."
>
  {#snippet toolbarStart()}
    {#if tabsNav}
      {@render tabsNav()}
    {/if}
  {/snippet}
  <!--
    Les deux onglets restent montés : celui qui dort ne doit pas parler à la barre du
    bas, sans quoi sa recherche écrase celle qu'on a sous les yeux. C'est ce qui s'était
    produit — la liste montrait des chèques et la loupe proposait de chercher un
    bordereau.
  -->
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={depositState.checkSearchQuery}
      searchPlaceholder="Rechercher un chèque (numéro, émetteur, banque…)"
      dockSearch={depositState.activeTab === 'checks'}
      hasFilters={true}
      filtersActive={false}
      onOpenFilters={() => (filtresOuverts = true)}
    >
      {#snippet filters()}
        <div class="space-y-4">
          {@render criteresDeListe()}
        </div>
      {/snippet}
      {#snippet actions()}
        {#if !depositState.isClosed}
          <!-- Sur téléphone, ces deux actions vivent dans la barre du bas. -->
          <div class="hidden flex-wrap justify-end gap-2 md:flex">
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
    <ChecksList {depositState} {seasonId} {onEditCheck} {onDeleteCheck} />
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
