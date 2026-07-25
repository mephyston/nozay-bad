<script lang="ts">
  import { Sparkles, Trash2, RefreshCw, ArrowLeft } from '@lucide/svelte';
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
  <Card.Root class="min-h-[400px] lg:h-[750px] bg-card border-border flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
    <div class="rounded-full bg-muted p-4 mb-4">
      <Sparkles class="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 class="font-semibold text-lg text-foreground mb-1">Aucune transaction sélectionnée</h3>
    <p class="text-sm max-w-md">Sélectionnez une transaction bancaire dans la liste de gauche pour afficher ses détails, consulter les suggestions IA ou la rapprocher.</p>
  </Card.Root>
{:else}
  <Card.Root class="min-h-[500px] h-auto lg:h-[750px] bg-card border-border flex flex-col overflow-hidden">
    <!-- En-tête de la transaction sélectionnée -->
    <div class="p-4 border-b border-border bg-muted/20 space-y-3">
      <!-- Bouton de retour sur mobile -->
      <div class="lg:hidden pb-1 border-b border-border/40">
        <Button
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs text-primary font-medium hover:text-primary/80 cursor-pointer -ml-2 h-7"
          onclick={() => {
            sessionStorage.removeItem('reconcile_active_bt_id');
            state.selectedTx = null;
          }}
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>Retour aux transactions</span>
        </Button>
      </div>

      <!-- Titre et Montant -->
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
        <div class="space-y-1 min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-bold text-base sm:text-lg text-foreground break-words">{state.selectedTx.name}</h3>
            {#if state.selectedTx.status === 'reconciled'}
              <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs shrink-0">
                Rapprochée
              </Badge>
            {:else if state.selectedTx.status === 'ignored'}
              <Badge variant="outline" class="bg-muted text-muted-foreground text-xs shrink-0">
                Ignorée
              </Badge>
            {/if}
          </div>
          {#if state.selectedTx.memo}
            <p class="text-xs text-muted-foreground break-words">{state.selectedTx.memo}</p>
          {/if}
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div class="text-left sm:text-right">
            <div class="font-outfit text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap {((state.selectedTx as any).amountCents ?? state.selectedTx.amount ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}">
              {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(((state.selectedTx as any).amountCents ?? state.selectedTx.amount ?? 0) / 100).replace(/\s/g, '\u00a0')} €
            </div>
            <div class="text-[11px] text-muted-foreground">{state.selectedTx.date}</div>
          </div>

          <button
            type="button"
            class="hidden lg:block text-muted-foreground hover:text-foreground p-1 text-sm rounded hover:bg-muted ml-2"
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

      <!-- Accordéon / Section repliable pour les détails secondaires -->
      <details class="group pt-2 border-t border-border/40 text-xs">
        <summary class="flex items-center justify-between font-medium cursor-pointer text-muted-foreground hover:text-foreground py-1 select-none">
          <span class="text-[11px] font-medium text-primary flex items-center gap-1">
            <span class="group-open:hidden">Afficher détails & actions ▼</span>
            <span class="hidden group-open:inline">Masquer détails & actions ▲</span>
          </span>
        </summary>
        
        <div class="pt-2 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-lg text-[11px]">
            <div class="space-y-0.5">
              <div>FITID: <span class="font-mono text-foreground font-medium">{state.selectedTx.fitid}</span></div>
              <div>ID interne: <span class="font-mono text-foreground font-semibold">{state.selectedTx.id}</span></div>
            </div>

            <div class="flex items-center gap-2">
              {#if state.selectedTx.status === 'ignored'}
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs gap-1 cursor-pointer"
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
                  class="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
                class="h-7 text-xs gap-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 cursor-pointer"
                disabled={state.isClosed || state.isAnalyzingSingle}
                onclick={() => state.handleAnalyzeSingle(state.selectedTx!.id)}
              >
                <Sparkles class="h-3 w-3" />
                <span>{state.isAnalyzingSingle ? 'Analyse...' : 'Re-analyser (IA)'}</span>
              </Button>
            </div>
          </div>
        </div>
      </details>
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
          <Tabs.Trigger value="manual" class="text-xs cursor-pointer">Saisir écriture</Tabs.Trigger>
          <Tabs.Trigger value="ledger" class="text-xs cursor-pointer">
            Suggestions ({state.suggestions.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="invoice" class="text-xs cursor-pointer">
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
