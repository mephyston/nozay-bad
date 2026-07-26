<script lang="ts">
  import { Sparkles, Trash2, RefreshCw, ArrowLeft } from '@lucide/svelte';
  import { Button, Card, Tabs, Badge } from '@nba/ui';
  import MatchTransaction from './MatchTransaction.svelte';
  import CreateLedgerEntryFromBankLine from './CreateLedgerEntryFromBankLine.svelte';
  import ReconciliationAiSuggestion from './ReconciliationAiSuggestion.svelte';
  import ReconciliationLinkedEntries from './ReconciliationLinkedEntries.svelte';
  import ReconciliationInvoicesTab from './ReconciliationInvoicesTab.svelte';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state = $bindable() }: { state: ReconciliationState } = $props();

  function formatShortDate(dateStr: string) {
    if (!dateStr) return '';
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
      } else {
        return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
      }
    }
    return dateStr;
  }
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
    <div class="p-3 sm:p-4 border-b border-border bg-muted/20 space-y-3">
      <!-- Barre supérieure d'actions & retour -->
      <div class="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
        <!-- Bouton de retour sur mobile -->
        <div class="lg:hidden">
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
            <span>Retour</span>
          </Button>
        </div>

        <div class="hidden lg:block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Détails de la transaction
        </div>

        <!-- Boutons d'action rapides sur la transaction -->
        <div class="flex items-center gap-2 shrink-0 ml-auto">
          {#if state.selectedTx.status === 'ignored'}
            <Button
              size="sm"
              variant="outline"
              class="h-7 text-xs gap-1.5 cursor-pointer"
              title="Réactiver cette ligne"
              disabled={state.isClosed || state.isSubmitting}
              onclick={() => state.handleUnignore(state.selectedTx!.id)}
            >
              <RefreshCw class="h-3.5 w-3.5" />
              <span>Réactiver</span>
            </Button>
          {:else}
            <Button
              size="sm"
              variant="outline"
              class="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Ignorer cette ligne"
              disabled={state.isClosed || state.isSubmitting}
              onclick={() => state.handleIgnore(state.selectedTx!.id)}
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>Ignorer</span>
            </Button>
          {/if}

          <Button
            size="sm"
            variant="ghost"
            class="h-7 text-xs gap-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 cursor-pointer"
            title="Re-analyser avec l'IA"
            disabled={state.isClosed || state.isAnalyzingSingle}
            onclick={() => state.handleAnalyzeSingle(state.selectedTx!.id)}
          >
            <Sparkles class="h-3.5 w-3.5" />
            <span>{state.isAnalyzingSingle ? 'Analyse...' : 'Re-analyser (IA)'}</span>
          </Button>

          <button
            type="button"
            class="hidden lg:block text-muted-foreground hover:text-foreground p-1 text-sm rounded hover:bg-muted ml-1"
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

      <!-- Détails complets de la transaction (100% de la largeur du cadre sur mobile) -->
      <div class="w-full space-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
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

        <div class="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
          <span class="font-outfit font-bold text-base sm:text-lg tabular-nums whitespace-nowrap {((state.selectedTx as any).amountCents ?? state.selectedTx.amount ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}">
            {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(((state.selectedTx as any).amountCents ?? state.selectedTx.amount ?? 0) / 100).replace(/\s/g, '\u00a0')} €
          </span>
          <span class="shrink-0">•</span>
          <span class="whitespace-nowrap shrink-0">{formatShortDate(state.selectedTx.date)}</span>
          {#if state.selectedTx.memo}
            <span class="shrink-0">•</span>
            <span class="italic break-words">{state.selectedTx.memo}</span>
          {/if}
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
          <Tabs.Trigger value="manual" class="text-xs cursor-pointer">Saisir écriture</Tabs.Trigger>
          <Tabs.Trigger value="ledger" class="text-xs cursor-pointer">
            Écritures existantes ({state.glTransactions.filter(gt => !gt.bankStatementLineId).length})
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
            bind:accrualType={state.accrualType}
            bind:accrualNote={state.accrualNote}
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
