<script lang="ts">
  import { Check, CheckCircle2, Inbox, Search, Trash2, X } from '@lucide/svelte';
  import { Badge, Button, Card, Input, SearchableCombobox } from '@nba/ui';
  import ReconciliationRow from './ReconciliationRow.svelte';
  import ReconciliationRowDetail from './ReconciliationRowDetail.svelte';
  import type { ReconciliationState } from './reconciliation.svelte';

  /* Prop renommée : déclarée `state`, elle capturerait la rune `$state`. */
  let { state: reconState = $bindable() }: { state: ReconciliationState } = $props();

  const MONTHS = [
    { label: 'Tous les mois', value: '' }, { label: 'Janvier', value: '01' }, { label: 'Février', value: '02' },
    { label: 'Mars', value: '03' }, { label: 'Avril', value: '04' }, { label: 'Mai', value: '05' },
    { label: 'Juin', value: '06' }, { label: 'Juillet', value: '07' }, { label: 'Août', value: '08' },
    { label: 'Septembre', value: '09' }, { label: 'Octobre', value: '10' }, { label: 'Novembre', value: '11' },
    { label: 'Décembre', value: '12' }
  ];

  const total = $derived(reconState.pendingCount + reconState.reconciledCount + reconState.ignoredCount);
  const done = $derived(reconState.reconciledCount + reconState.ignoredCount);
  const progress = $derived(total === 0 ? 0 : Math.round((done / total) * 100));

  const rows = $derived(reconState.view === 'history' ? reconState.historyTransactions : reconState.queueTransactions);
  const selectedCount = $derived(reconState.selectedCount);
</script>

<Card.Root class="flex flex-col overflow-hidden">
  <!-- L'en-tête dit où l'on en est, et non ce qu'on pourrait filtrer. -->
  <div class="p-4 border-b border-border bg-muted/30 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        {#if reconState.view === 'queue'}
          <Inbox class="h-4 w-4 text-primary" />
          <h2 class="text-sm font-bold">
            {reconState.pendingCount} opération{reconState.pendingCount > 1 ? 's' : ''} à rapprocher
          </h2>
        {:else}
          <CheckCircle2 class="h-4 w-4 text-success" />
          <h2 class="text-sm font-bold">Historique</h2>
        {/if}
        <span class="text-xs text-muted-foreground">
          {done} sur {total} traitée{done > 1 ? 's' : ''}
        </span>
      </div>

      <div class="flex items-center gap-2">
        {#if reconState.view === 'queue'}
          <Button
            variant="ghost"
            size="sm"
            class="text-xs h-8"
            onclick={() => (reconState.view = 'history')}
          >
            Voir l'historique ({reconState.reconciledCount + reconState.ignoredCount})
          </Button>
        {:else}
          <Button variant="ghost" size="sm" class="text-xs h-8 gap-1" onclick={() => (reconState.view = 'queue')}>
            <X class="h-3.5 w-3.5" />
            <span>Revenir à la file</span>
          </Button>
        {/if}
      </div>
    </div>

    <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div class="h-full bg-success transition-all duration-500" style={`width: ${progress}%`}></div>
    </div>

    {#if reconState.view === 'history'}
      <div class="flex items-center gap-1">
        <Button
          variant={reconState.activeTab === 'reconciled' ? 'default' : 'ghost'}
          size="sm" class="text-xs h-7"
          onclick={() => (reconState.activeTab = 'reconciled')}
        >
          Rapprochées ({reconState.reconciledCount})
        </Button>
        <Button
          variant={reconState.activeTab === 'ignored' ? 'default' : 'ghost'}
          size="sm" class="text-xs h-7"
          onclick={() => (reconState.activeTab = 'ignored')}
        >
          Ignorées ({reconState.ignoredCount})
        </Button>
      </div>
    {/if}

    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher une opération…"
          bind:value={reconState.searchQuery}
          class="h-8 text-xs pl-7 pr-7"
        />
        {#if reconState.searchQuery}
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onclick={() => (reconState.searchQuery = '')}
          >
            <X class="h-3.5 w-3.5" />
          </button>
        {/if}
      </div>
      <SearchableCombobox class="h-8 text-xs w-40" items={MONTHS} bind:value={reconState.monthFilter} />

      {#if reconState.view === 'queue'}
        <!--
          La sélection multiple ne s'impose pas à l'écran : les cases encombraient chaque ligne
          alors qu'elles ne servent qu'à écarter du bruit — frais bancaires, prélèvements connus.
          Elle n'offre d'ailleurs que « Ignorer » : une écriture comptable se valide une par une.
        -->
        <Button
          variant={reconState.isMultiSelect ? 'default' : 'outline'}
          size="sm"
          class="h-8 text-xs shrink-0"
          onclick={() => {
            reconState.isMultiSelect = !reconState.isMultiSelect;
            if (!reconState.isMultiSelect) reconState.selectedTxIds = {};
          }}
        >
          Sélection
        </Button>
      {/if}
    </div>

    {#if reconState.isMultiSelect && reconState.view === 'queue'}
      <div class="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-input"
            checked={rows.length > 0 && rows.every((t) => reconState.selectedTxIds[t.id])}
            onchange={() => reconState.toggleSelectAll(rows)}
            disabled={rows.length === 0}
          />
          <span>Tout sélectionner ({rows.length})</span>
        </label>

        {#if selectedCount > 0}
          <div class="flex items-center gap-2">
            <Badge variant="secondary" size="xs">{selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}</Badge>
            <Button
              size="sm" variant="ai" class="text-xs h-7 gap-1.5"
              disabled={reconState.isClosed || reconState.isSubmitting}
              onclick={reconState.handleBulkReconcile}
            >
              <Check class="h-3.5 w-3.5" />
              <span>Valider les propositions</span>
            </Button>
            <Button
              size="sm" variant="outline"
              class="text-xs h-7 gap-1 text-destructive hover:bg-destructive/10"
              disabled={reconState.isClosed || reconState.isSubmitting}
              onclick={reconState.handleBulkIgnore}
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>Ignorer</span>
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="divide-y-0">
    {#if rows.length === 0}
      <div class="p-12 text-center text-muted-foreground">
        {#if reconState.searchQuery || reconState.monthFilter}
          <p class="text-sm">Aucune opération ne correspond à cette recherche.</p>
        {:else if reconState.view === 'history'}
          <p class="text-sm">
            {reconState.activeTab === 'reconciled' ? 'Aucune opération rapprochée.' : 'Aucune opération ignorée.'}
          </p>
        {:else}
          <CheckCircle2 class="h-10 w-10 mx-auto mb-3 text-success" />
          <p class="text-base font-semibold text-foreground">La file est vide.</p>
          <p class="text-sm">Toutes les opérations du relevé ont été traitées.</p>
        {/if}
      </div>
    {:else}
      {#each rows as line (line.id)}
        <ReconciliationRow
          bind:state={reconState}
          {line}
          isExpanded={reconState.selectedTx?.id === line.id}
          showCheckbox={reconState.isMultiSelect && reconState.view === 'queue'}
        >
          <ReconciliationRowDetail bind:state={reconState} {line} />
        </ReconciliationRow>
      {/each}
    {/if}
  </div>
</Card.Root>
