<script lang="ts">
  import { Calendar, Plus } from "@lucide/svelte";
  import { Button, Input, Badge, Sheet, AlertDialog, DataTable, DataTableToolbar, Table, DataTableColumnHeader } from "@nba/ui";

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
    onCreateSeason: (e: Event) => void;
    onToggleSeasonActive: (id: string) => void;
    onCloseSeason: (id: string, confirmOverwrite: boolean) => void;
    onCheckCloseSeason: (id: string) => Promise<any>;
    tabsNav?: any;
  } = $props();

  function handleSubmit(e: Event) {
    onCreateSeason(e);
    showAddSheet = false;
  }

  let closingSeasonId = $state<string | null>(null);
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
</script>

  <DataTable
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
          <Button onclick={() => showAddSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <Plus class="w-4 h-4" />
            Nouvelle saison
          </Button>
        {/snippet}
      </DataTableToolbar>
    {/snippet}

    {#snippet mobileView()}
      <div class="flex flex-col gap-4">
        {#each sortedSeasons as s}
          <div class="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 relative">
            <div class="flex justify-between items-start gap-2">
              <span class="font-bold text-sm text-foreground">{s.name}</span>
              <div class="flex items-center gap-3">
                {#if s.closed}
                  <Badge variant="outline" class="bg-muted text-muted-foreground border-border font-bold">
                    Clôturée
                  </Badge>
                {:else}
                  {#if s.active}
                    <Badge variant="outline" class="bg-primary/10 hover:bg-primary/10 text-primary border-primary/20 font-bold">
                      Active
                    </Badge>
                  {/if}
                {/if}
              </div>
            </div>
            {#if !s.closed}
              <div class="flex justify-end gap-2 pt-2 border-t border-border mt-1">
                {#if !s.active}
                  <Button variant="outline" size="sm" class="h-8 text-xs flex-1" onclick={() => onToggleSeasonActive(s.id)} disabled={isSubmitting}>
                    Activer
                  </Button>
                {/if}
                <Button variant="outline" size="sm" class="h-8 text-xs flex-1 border-destructive/20 text-destructive hover:bg-destructive/10" onclick={() => handleStartClose(s.id)} disabled={isSubmitting}>
                  Clôturer
                </Button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
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
            <Badge variant="outline" class="bg-muted text-muted-foreground border-border font-bold">
              Clôturée
            </Badge>
          {:else}
            {#if s.active}
              <Badge variant="outline" class="bg-primary/10 hover:bg-primary/10 text-primary border-primary/20 font-bold">
                Active
              </Badge>
            {/if}
          {/if}
        </Table.Cell>
        <Table.Cell class="text-right">
          {#if !s.closed}
            <div class="flex justify-end items-center gap-2">
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
              <Button
                variant="destructive"
                size="sm"
                onclick={() => handleStartClose(s.id)}
                disabled={isSubmitting}
              >
                Clôturer
              </Button>
            </div>
          {/if}
        </Table.Cell>
      </Table.Row>
    {/snippet}
  </DataTable>

<Sheet.Root bind:open={showAddSheet}>
    <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border overflow-y-auto">
      <Sheet.Header>
        <Sheet.Title class="flex items-center gap-2">
          <Calendar class="w-5 h-5 text-primary" />
          Nouvelle saison
        </Sheet.Title>
        <Sheet.Description>Ajoutez un nouvel exercice comptable pour l'association.</Sheet.Description>
      </Sheet.Header>
      <form onsubmit={handleSubmit} class="space-y-4 pt-4">
        <div class="space-y-1.5">
          <label for="new-season-id" class="block text-xs font-bold text-muted-foreground uppercase">ID (ex: 26-27)</label>
          <Input
            type="text"
            id="new-season-id"
            bind:value={newSeasonId}
            placeholder="26-27"
            required
          />
        </div>
        <div class="space-y-1.5">
          <label for="new-season-name" class="block text-xs font-bold text-muted-foreground uppercase">Libellé (ex: Saison 2026-2027)</label>
          <Input
            type="text"
            id="new-season-name"
            bind:value={newSeasonName}
            placeholder="Saison 2026-2027"
            required
          />
        </div>

        <div class="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="new-season-active"
            bind:checked={newSeasonActive}
            class="rounded border-border focus:ring-primary h-4 w-4"
          />
          <label for="new-season-active" class="text-xs font-medium text-foreground">Définir comme active immédiatement</label>
        </div>

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
          <div class="mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-sm">
            <strong class="block mb-2">Erreur lors de la vérification :</strong>
            {checkError}
          </div>
        {:else if checkData}
          {#if checkData.canClose === false || (checkData.blockingItems && checkData.blockingItems.length > 0)}
            <div class="mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-sm">
              <strong class="block mb-2">Clôture impossible :</strong>
              <ul class="list-disc pl-4 space-y-1">
                {#each checkData.blockingItems as item}
                  <li>{item.message}</li>
                {/each}
              </ul>
            </div>
          {:else}
            <div class="space-y-4">
              <p>
                Êtes-vous sûr de vouloir clôturer définitivement cette saison ?
                Cette action est irréversible et bloquera toute modification comptable pour cette période.
              </p>

              {#if checkData.existingInitialBalancesOnNextSeason && checkData.existingInitialBalancesOnNextSeason.some(b => b.discrepancy)}
                <div class="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-sm space-y-2">
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
                </div>

                <div class="flex items-start space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="confirm-overwrite"
                    bind:checked={confirmOverwrite}
                    class="mt-1 rounded border-border text-destructive focus:ring-destructive"
                  />
                  <label for="confirm-overwrite" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Je confirme vouloir écraser les soldes initiaux de la saison {checkData.nextSeasonCode}.
                  </label>
                </div>
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

