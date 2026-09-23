<script lang="ts">
  import SeasonList from './SeasonList.svelte';
  import { Calendar, Plus, Wallet2 } from "@lucide/svelte";
  import { Button, Input, Badge, Sheet, AlertDialog, DataTable, DataTableToolbar, Table, DataTableColumnHeader, FormField, Alert, Card , Checkbox , dockDePage } from '@nba/ui';
  import InitialBalancesConfig from "./InitialBalancesConfig.svelte";

  let {
    seasons = [],
    isSubmitting = false,
    showAddSheet = $bindable(false),
    newSeasonId = $bindable(''),
    newSeasonName = $bindable(''),
    newSeasonActive = $bindable(false),
    onCreateSeason,
    onToggleSeasonActive,
    onCloseSeason,
    onCheckCloseSeason,
    tabsNav
  }: {
    seasons: any[];
    isSubmitting: boolean;
    showAddSheet?: boolean;
    newSeasonId: string;
    newSeasonName: string;
    newSeasonActive: boolean;
    onCreateSeason: (e: Event) => Promise<boolean>;
    onToggleSeasonActive: (id: string) => void;
    onCloseSeason: (id: string, confirmOverwrite: boolean) => void;
    onCheckCloseSeason: (id: string) => Promise<any>;
    tabsNav?: any;
  } = $props();

  async function handleSubmit(e: Event) {
    // Fermer sans attendre effaçait la saisie même quand le serveur refusait.
    if (await onCreateSeason(e)) showAddSheet = false;
  }

  let closingSeasonId = $state<string | null>(null);
  let showBalancesSheet = $state(false);
  let balancesSeasonId = $state<string | null>(null);

  function openBalances(id: string) {
    balancesSeasonId = id;
    showBalancesSheet = true;
  }

  let closingSeasonName = $derived(seasons.find(s => String(s.id) === String(closingSeasonId))?.name || closingSeasonId);
  let confirmOverwrite = $state(false);
  let checkData = $state<any>(null);
  let isChecking = $state(false);
  let checkError = $state<string | null>(null);

  async function handleStartClose(id: string) {
    closingSeasonId = id;
    isChecking = true;
    checkData = null;
    checkError = null;
    confirmOverwrite = false;
    try {
      checkData = await onCheckCloseSeason(id);
    } catch (e) {
      console.error(e);
      checkError = e instanceof Error ? e.message : String(e);
    } finally {
      isChecking = false;
    }
  }

  function handleConfirmClose() {
    if (closingSeasonId) {
      onCloseSeason(closingSeasonId, confirmOverwrite);
      closingSeasonId = null;
    }
  }

  const sortedSeasons = $derived([...seasons].sort((a, b) => String(b.id).localeCompare(String(a.id))));


  /*
    La création descend dans la barre du bas, comme sur tous les autres écrans : le
    bouton vivait en haut d'une barre d'outils qui défile avec la liste, donc hors de
    vue dès qu'on en parcourt le contenu — c'est-à-dire chaque fois qu'on vient y ajouter
    quelque chose.
  */
  $effect(() =>
    dockDePage.declarerActions([
      { id: 'saison', label: 'Nouvelle saison', icon: Plus, run: () => (showAddSheet = true) }
    ])
  );
</script>

  <DataTable
    mobileSpacing="list"
    data={sortedSeasons}
    emptyTitle="Aucune saison"
    emptyDescription="Aucun exercice comptable n'a encore été créé."
  >
    {#snippet toolbarStart()}
      {#if tabsNav}
        {@render tabsNav()}
      {/if}
    {/snippet}

    {#snippet toolbar()}
      <DataTableToolbar hasSearch={false}>
        {#snippet actions()}
          <Button onclick={() => showAddSheet = true} size="sm" class="hidden md:flex font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <Plus class="w-4 h-4" />
            Nouvelle saison
          </Button>
        {/snippet}
      </DataTableToolbar>
    {/snippet}

    {#snippet mobileView()}
      <SeasonList
        seasons={sortedSeasons}
        onSoldes={openBalances}
        onActiver={onToggleSeasonActive}
        onCloturer={(id) => void handleStartClose(id)}
      />
    {/snippet}

    {#snippet header()}
      <DataTableColumnHeader title="Saison" />
      <DataTableColumnHeader title="Statut" />
      <DataTableColumnHeader title="Actions" class="text-right" />
    {/snippet}

    {#snippet row(s)}
      <Table.Row>
        <Table.Cell class="font-medium">
          {s.name}
        </Table.Cell>
        <Table.Cell>
          {#if s.closed}
            <Badge variant="secondary">
              Clôturée
            </Badge>
          {:else}
            {#if s.active}
              <Badge variant="primary-soft">
                Active
              </Badge>
            {/if}
          {/if}
        </Table.Cell>
        <Table.Cell class="text-right">
          <div class="flex justify-end items-center gap-2">
            {#if !s.closed}
              {#if !s.active}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => onToggleSeasonActive(s.id)}
                  disabled={isSubmitting}
                >
                  Activer
                </Button>
              {/if}
            {/if}
            <Button
              variant="outline"
              size="sm"
              onclick={() => openBalances(s.id)}
            >
              {s.closed ? 'Voir soldes' : 'Soldes'}
            </Button>
            {#if !s.closed}
              <Button
                variant="destructive"
                size="sm"
                onclick={() => handleStartClose(s.id)}
                disabled={isSubmitting}
              >
                Clôturer
              </Button>
            {/if}
          </div>
        </Table.Cell>
      </Table.Row>
    {/snippet}
  </DataTable>

<Sheet.Root bind:open={showAddSheet}>
    <Sheet.Content size="md" class="overflow-y-auto">
      <Sheet.Header>
        <Sheet.Title class="flex items-center gap-2">
          <Calendar class="w-5 h-5 text-primary" />
          Nouvelle saison
        </Sheet.Title>
        <Sheet.Description>Ajoutez un nouvel exercice comptable pour l'association.</Sheet.Description>
      </Sheet.Header>
      <form onsubmit={handleSubmit} class="space-y-4 pt-4">
          <FormField id="new-season-id" label="ID (ex: 26-27)">
          <Input
            type="text"
            id="new-season-id"
            bind:value={newSeasonId}
            placeholder="26-27"
            required
          />
          </FormField>
          <FormField id="new-season-name" label="Libellé (ex: Saison 2026-2027)">
          <Input
            type="text"
            id="new-season-name"
            bind:value={newSeasonName}
            placeholder="Saison 2026-2027"
            required
          />
        </FormField>

        <FormField id="new-season-active" label="Définir comme active immédiatement">
          <Checkbox id="new-season-active" bind:checked={newSeasonActive} />
        </FormField>

        <Sheet.Footer class="pt-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            class="w-full font-bold flex items-center justify-center gap-1.5"
          >
            <Plus class="w-4 h-4" />
            Créer la saison
          </Button>
        </Sheet.Footer>
      </form>
    </Sheet.Content>
  </Sheet.Root>

<AlertDialog.Root open={!!closingSeasonId} onOpenChange={(o) => { if(!o) closingSeasonId = null; }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Clôturer la {closingSeasonName} ?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if isChecking}
          <div class="flex items-center gap-2 text-muted-foreground mt-4">
            <span class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
            Vérification comptable en cours...
          </div>
        {:else if checkError}
          <Alert.Root variant="destructive" class="mt-4 p-3 rounded text-sm">
          <Alert.Description>
            <strong class="block mb-2">Erreur lors de la vérification :</strong>
            {checkError}
          </Alert.Description>
          </Alert.Root>
        {:else if checkData}
          {#if checkData.canClose === false || (checkData.blockingItems && checkData.blockingItems.length > 0)}
            <Alert.Root variant="destructive" class="mt-4 p-3 rounded text-sm">
            <Alert.Description>
              <strong class="block mb-2">Clôture impossible :</strong>
              <ul class="list-disc pl-4 space-y-1">
                {#each checkData.blockingItems as item}
                  <li>{item.message}</li>
                {/each}
              </ul>
            </Alert.Description>
            </Alert.Root>
          {:else}
            <div class="space-y-4">
              <p>
                Êtes-vous sûr de vouloir clôturer définitivement cette saison ?
                Cette action est irréversible et bloquera toute modification comptable pour cette période.
              </p>

              {#if checkData.existingInitialBalancesOnNextSeason && checkData.existingInitialBalancesOnNextSeason.some(b => b.discrepancy)}
                <Alert.Root variant="warning" class="p-3 rounded text-sm space-y-2">
                <Alert.Description>
                  <strong>⚠️ Attention : écarts détectés sur la saison suivante ({checkData.nextSeasonCode}) !</strong>
                  <p>Les soldes de départ actuels de la saison suivante vont être modifiés :</p>
                  <ul class="list-disc pl-4 space-y-1">
                    {#each checkData.existingInitialBalancesOnNextSeason.filter(b => b.discrepancy) as b}
                      <li>
                        <strong>{b.accountLabel || b.accountCode}</strong> : 
                        Actuel = <strong>{(b.existingBalanceCents / 100).toFixed(2)} €</strong> 
                        &rarr; Nouveau = <strong>{(b.newBalanceCents / 100).toFixed(2)} €</strong>
                      </li>
                    {/each}
                  </ul>
                </Alert.Description>
                </Alert.Root>

                <FormField id="confirm-overwrite" label={`Je confirme vouloir écraser les soldes initiaux de la saison ${checkData.nextSeasonCode}.`}>
                  <Checkbox id="confirm-overwrite" bind:checked={confirmOverwrite} class="mt-1" />
                </FormField>
              {/if}
            </div>
          {/if}
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action 
        onclick={handleConfirmClose} 
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        disabled={isSubmitting || isChecking || (checkData && !checkData.canClose) || (checkData?.existingInitialBalancesOnNextSeason?.some(b => b.discrepancy) && !confirmOverwrite)}
      >
        Clôturer définitivement
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<Sheet.Root bind:open={showBalancesSheet}>
  <Sheet.Content size="md" class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Wallet2 class="w-5 h-5 text-primary" />
        Soldes Initiaux de la Saison
      </Sheet.Title>
      <Sheet.Description>
        Définissez l'état des comptes de l'association au premier jour de la saison comptable (1er septembre).
      </Sheet.Description>
    </Sheet.Header>
    <div class="pt-6">
      {#if balancesSeasonId}
        <InitialBalancesConfig {seasons} seasonId={balancesSeasonId} />
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>

