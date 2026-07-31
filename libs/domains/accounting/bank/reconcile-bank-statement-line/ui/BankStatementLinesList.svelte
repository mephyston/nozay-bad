<script lang="ts">
  import { Check, Sparkles, Trash2 } from '@lucide/svelte';
  import { Button, Input, Badge, Card, Checkbox, Tabs } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state = $bindable() }: { state: ReconciliationState } = $props();
</script>

<Card.Root class="flex flex-col min-h-[500px] h-auto lg:h-[750px] overflow-hidden">
  <div class="p-3 border-b border-border bg-muted/40 space-y-3">
    <!-- Onglets de statut -->
    <Tabs.Root value={state.activeTab} onValueChange={(v) => state.activeTab = v as any} class="w-full">
      <Tabs.List class="flex w-full justify-start sm:justify-center overflow-x-auto no-scrollbar">
        <Tabs.Trigger value="pending" class="text-xs gap-1.5 cursor-pointer">
          À rapprocher ({state.pendingCount})
        </Tabs.Trigger>
        <Tabs.Trigger value="reconciled" class="text-xs gap-1.5 cursor-pointer">
          Rapprochées ({state.reconciledCount})
        </Tabs.Trigger>
        <Tabs.Trigger value="ignored" class="text-xs gap-1.5 cursor-pointer">
          Ignorées ({state.ignoredCount})
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    <!-- Recherche et Filtre par mois -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
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
      <select
        class="h-8 px-2 border border-border bg-background rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary w-28 shrink-0 cursor-pointer"
        bind:value={state.monthFilter}
      >
        <option value="">Tous</option>
        <option value="01">Janvier</option>
        <option value="02">Février</option>
        <option value="03">Mars</option>
        <option value="04">Avril</option>
        <option value="05">Mai</option>
        <option value="06">Juin</option>
        <option value="07">Juillet</option>
        <option value="08">Août</option>
        <option value="09">Septembre</option>
        <option value="10">Octobre</option>
        <option value="11">Novembre</option>
        <option value="12">Décembre</option>
      </select>
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
          variant="ai"
          class="flex-1 text-xs h-8 gap-1.5"
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
              <div class="font-outfit text-sm font-semibold tabular-nums shrink-0 whitespace-nowrap {((bt as any).amountCents ?? bt.amount ?? 0) < 0 ? 'text-destructive' : 'text-success'}">
                {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(((bt as any).amountCents ?? bt.amount ?? 0) / 100).replace(/\s/g, '\u00a0')} €
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
                <Badge variant="ai" size="xs" class="shrink-0">
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
