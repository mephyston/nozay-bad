<script lang="ts">
  import { Sparkles, Trash2, RefreshCw } from '@lucide/svelte';
  import { Button, Card, Tabs, Badge } from '@nba/ui';
  import MatchTransaction from './MatchTransaction.svelte';
  import CreateLedgerEntryFromBankLine from './CreateLedgerEntryFromBankLine.svelte';
  import ReconciliationAiSuggestion from './ReconciliationAiSuggestion.svelte';
  import ReconciliationLinkedEntries from './ReconciliationLinkedEntries.svelte';
  import ReconciliationInvoicesTab from './ReconciliationInvoicesTab.svelte';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state }: { state: ReconciliationState } = $props();
</script>

{#if !state.selectedTx}
  <Card.Root class="h-[750px] bg-card border-border flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
    <div class="rounded-full bg-muted p-4 mb-4">
      <Sparkles class="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 class="font-semibold text-lg text-foreground mb-1">Aucune transaction sélectionnée</h3>
    <p class="text-sm max-w-md">Sélectionnez une transaction bancaire dans la liste de gauche pour afficher ses détails, consulter les suggestions IA ou la rapprocher.</p>
  </Card.Root>
{:else}
  <Card.Root class="h-[750px] bg-card border-border flex flex-col overflow-hidden">
    <!-- En-tête de la transaction sélectionnée -->
    <div class="p-4 border-b border-border bg-muted/20 space-y-3">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-lg">{state.selectedTx.name}</h3>
            {#if state.selectedTx.status === 'reconciled'}
              <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
                Rapprochée
              </Badge>
            {:else if state.selectedTx.status === 'ignored'}
              <Badge variant="outline" class="bg-muted text-muted-foreground text-xs">
                Ignorée
              </Badge>
            {/if}
          </div>
          {#if state.selectedTx.memo}
            <p class="text-xs text-muted-foreground mt-0.5">{state.selectedTx.memo}</p>
          {/if}
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <div class="text-right">
            <div class="font-outfit text-xl font-bold tabular-nums {((state.selectedTx as any).amountCents ?? state.selectedTx.amount ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}">
              {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(((state.selectedTx as any).amountCents ?? state.selectedTx.amount ?? 0) / 100).replace(/\s/g, ' ')} €
            </div>
            <div class="text-[11px] text-muted-foreground">{state.selectedTx.date}</div>
          </div>

          <button
            type="button"
            class="text-muted-foreground hover:text-foreground p-1 text-sm rounded hover:bg-muted ml-2"
            onclick={() => {
              sessionStorage.removeItem('reconcile_active_bt_id');
              state.selectedTx = null;
            }}
            title="Fermer le panneau"
          >
            ✕ <span class="sr-only">Fermer</span>
          </button>
        </div>
      </div>

      <!-- Actions rapides sur la transaction -->
      <div class="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
        <div class="text-muted-foreground">
          FITID: <span class="font-mono text-[11px]">{state.selectedTx.fitid}</span>
        </div>

        <div class="flex items-center gap-2">
          {#if state.selectedTx.status === 'ignored'}
            <Button
              size="sm"
              variant="outline"
              class="h-7 text-xs gap-1"
              disabled={state.isClosed || state.isSubmitting}
              onclick={() => state.handleUnignore(state.selectedTx!.id)}
            >
              <RefreshCw class="h-3 w-3" />
              <span>Réactiver</span>
            </Button>
          {:else}
            <Button
              size="sm"
              variant="outline"
              class="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={state.isClosed || state.isSubmitting}
              onclick={() => state.handleIgnore(state.selectedTx!.id)}
            >
              <Trash2 class="h-3 w-3" />
              <span>Ignorer cette ligne</span>
            </Button>
          {/if}

          <Button
            size="sm"
            variant="ghost"
            class="h-7 text-xs gap-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            disabled={state.isClosed || state.isAnalyzingSingle}
            onclick={() => state.handleAnalyzeSingle(state.selectedTx!.id)}
          >
            <Sparkles class="h-3 w-3" />
            <span>{state.isAnalyzingSingle ? 'Analyse...' : 'Re-analyser (IA)'}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Zone principale avec scroll -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      {#if state.selectedTx.aiSuggestions && state.selectedTx.status === 'pending'}
        <ReconciliationAiSuggestion {state} selectedTx={state.selectedTx} />
      {/if}

      <ReconciliationLinkedEntries {state} selectedTx={state.selectedTx} />

      <!-- Onglets de rapprochement -->
      <Tabs.Root value={state.activeRightTab} onValueChange={(v) => state.activeRightTab = v as any} class="w-full">
        <Tabs.List class="grid grid-cols-3 w-full mb-4">
          <Tabs.Trigger value="manual" class="text-xs">Saisir écriture</Tabs.Trigger>
          <Tabs.Trigger value="ledger" class="text-xs">
            Suggestions ({state.suggestions.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="invoice" class="text-xs">
            Associer Facture ({state.unpaidInvoices.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="manual">
          <CreateLedgerEntryFromBankLine
            selectedTx={state.selectedTx}
            remainingAmount={state.remainingAmount}
            bind:category={state.category}
            bind:paymentMethod={state.paymentMethod}
            bind:selectedMemberId={state.selectedMemberId}
            isSubmitting={state.isSubmitting}
            handleCreateAndMatch={state.handleCreateAndMatch}
            bind:isSplitMode={state.isSplitMode}
            bind:splits={state.splits}
            addSplitRow={state.addSplitRow}
            removeSplitRow={state.removeSplitRow}
            categories={state.categories}
            sortedMembers={state.sortedMembers}
            bind:isMemberDropdownOpen={state.isMemberDropdownOpen}
            bind:isCategoryDropdownOpen={state.isCategoryDropdownOpen}
            bind:memberSearchQuery={state.memberSearchQuery}
            bind:categorySearchQuery={state.categorySearchQuery}
          />
        </Tabs.Content>

        <Tabs.Content value="ledger">
          <MatchTransaction
            selectedTx={state.selectedTx}
            isClosed={state.isClosed}
            isSubmitting={state.isSubmitting}
            suggestions={state.suggestions}
            glTransactions={state.glTransactions}
            handleMatch={state.handleMatch}
          />
        </Tabs.Content>

        <Tabs.Content value="invoice">
          <ReconciliationInvoicesTab {state} selectedTx={state.selectedTx} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </Card.Root>
{/if}
