<script lang="ts">
  import { Check, Sparkles, Trash2 } from '@lucide/svelte';
  import { Button, Input, Badge, Card, Checkbox } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state }: { state: ReconciliationState } = $props();
</script>

<Card.Root class="flex flex-col h-[750px] bg-card border-border overflow-hidden">
  <div class="p-3 border-b border-border bg-muted/40 space-y-3">
    <!-- Onglets de statut -->
    <div class="flex items-center gap-1 bg-muted p-1 rounded-lg">
      <button
        class="flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 {state.activeTab === 'pending' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => state.activeTab = 'pending'}
      >
        À rapprocher ({state.pendingCount})
      </button>

      <button
        class="flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 {state.activeTab === 'reconciled' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => state.activeTab = 'reconciled'}
      >
        Rapprochées ({state.reconciledCount})
      </button>

      <button
        class="flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 {state.activeTab === 'ignored' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => state.activeTab = 'ignored'}
      >
        Ignorées ({state.ignoredCount})
      </button>
    </div>

    <!-- Champ de recherche textuel libre -->
    <div class="relative">
      <Input
        type="text"
        placeholder="Rechercher une transaction..."
        bind:value={state.searchQuery}
        class="h-8 text-xs pl-3 pr-8"
      />
      {#if state.searchQuery}
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          onclick={() => state.searchQuery = ''}
        >
          ✕
        </button>
      {/if}
    </div>

    <!-- Barre d'action en masse -->
    {#if state.activeTab === 'pending'}
      <div class="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-input"
            checked={state.displayedTransactions.length > 0 && state.displayedTransactions.every(t => state.selectedTxIds[t.id])}
            onchange={() => state.toggleSelectAll(state.displayedTransactions)}
            disabled={state.displayedTransactions.length === 0}
          />
          <span class="text-muted-foreground">Tout sélectionner ({state.displayedTransactions.length})</span>
        </div>

        {#if state.selectedCount > 0}
          <span class="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
            Sélection ({state.selectedCount})
          </span>
        {/if}
      </div>
    {/if}

    {#if state.selectedCount > 0 && state.activeTab === 'pending'}
      <div class="flex items-center gap-2 pt-2 border-t border-border">
        <Button
          size="sm"
          variant="default"
          class="flex-1 text-xs h-8 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          disabled={state.isClosed || state.isSubmitting}
          onclick={state.handleBulkReconcile}
        >
          <Check class="h-3.5 w-3.5" />
          <span>Rapprocher en masse</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          class="text-xs h-8 gap-1 text-destructive hover:bg-destructive/10"
          disabled={state.isClosed || state.isSubmitting}
          onclick={state.handleBulkIgnore}
        >
          <Trash2 class="h-3.5 w-3.5" />
          <span>Ignorer en masse</span>
        </Button>
      </div>
    {/if}
  </div>

  <!-- Liste des transactions -->
  <div
    class="flex-1 overflow-y-auto divide-y divide-border reconcile-list-container"
    onscroll={(e) => {
      const target = e.target as HTMLElement;
      sessionStorage.setItem('reconcile_list_scroll_top', target.scrollTop.toString());
    }}
  >
    {#if state.displayedTransactions.length === 0}
      <div class="p-8 text-center text-muted-foreground text-sm">
        {#if state.searchQuery}
          Aucune transaction ne correspond à "{state.searchQuery}".
        {:else if state.activeTab === 'pending'}
          Aucune transaction bancaire en attente de rapprochement.
        {:else if state.activeTab === 'reconciled'}
          Aucune transaction bancaire rapprochée pour le moment.
        {:else}
          Aucune transaction ignorée.
        {/if}
      </div>
    {:else}
      {#each state.displayedTransactions as bt (bt.id)}
        <div
          class="w-full text-left transition-colors flex items-center group {state.selectedTx?.id === bt.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/50'}"
        >
          {#if state.activeTab === 'pending'}
            <div class="pl-3 pr-1 py-3 flex items-center justify-center">
              <Checkbox
                checked={!!state.selectedTxIds[bt.id]}
                onCheckedChange={() => {
                  state.selectedTxIds[bt.id] = !state.selectedTxIds[bt.id];
                  state.selectedTxIds = { ...state.selectedTxIds };
                }}
              />
            </div>
          {/if}

          <button
            type="button"
            class="flex-1 p-3 text-left focus:outline-none min-w-0"
            onclick={() => state.selectedTx = bt}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="font-medium text-sm truncate">{bt.name}</div>
              <div class="font-mono text-sm font-semibold shrink-0 {bt.amount < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}">
                {(bt.amount / 100).toFixed(2)} €
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 mt-1 text-xs text-muted-foreground">
              <div class="flex items-center gap-2 truncate">
                <span>{bt.date}</span>
                {#if bt.memo}
                  <span class="truncate italic opacity-75">({bt.memo})</span>
                {/if}
              </div>

              {#if bt.aiSuggestions && bt.status === 'pending'}
                <Badge variant="outline" class="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-[10px] gap-1 shrink-0">
                  <Sparkles class="h-3 w-3" />
                  <span>IA</span>
                </Badge>
              {/if}
            </div>
          </button>
        </div>
      {/each}
    {/if}
  </div>
</Card.Root>
