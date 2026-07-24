<script lang="ts">
  import { Sparkles, Trash2, RefreshCw, Check } from '@lucide/svelte';
  import { Button, Card, Tabs, Badge } from '@nba/ui';
  import MatchTransaction from './MatchTransaction.svelte';
  import CreateLedgerEntryFromBankLine from './CreateLedgerEntryFromBankLine.svelte';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  let { state }: { state: ReconciliationState } = $props();

  function renderAiSuggestions(bt: BankStatementLine) {
    if (!bt.aiSuggestions) return null;
    try {
      const sug = JSON.parse(bt.aiSuggestions);
      return sug;
    } catch (e) {
      return null;
    }
  }
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
            <div class="font-mono text-xl font-bold {state.selectedTx.amount < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}">
              {(state.selectedTx.amount / 100).toFixed(2)} €
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
      <!-- Section IA Suggestions -->
      {#if state.selectedTx.aiSuggestions && state.selectedTx.status === 'pending'}
        {@const sug = renderAiSuggestions(state.selectedTx)}
        {#if sug}
          <div class="rounded-xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/40 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-sm">
                <Sparkles class="h-4 w-4" />
                <span>Suggestion d'analyse automatique IA</span>
              </div>
              {#if sug.confidence}
                <Badge variant="outline" class="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 text-[10px]">
                  Confiance : {Math.round(sug.confidence * 100)}%
                </Badge>
              {/if}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span class="text-muted-foreground block">Catégorie suggérée :</span>
                <span class="font-medium text-foreground">
                  {state.categories.find(c => c.id === String(sug.category))?.name || `Catégorie #${sug.category}`}
                </span>
              </div>

              <div>
                <span class="text-muted-foreground block">Adhérent identifié :</span>
                <span class="font-medium text-foreground">
                  {sug.memberName || (sug.memberId ? `Adhérent #${sug.memberId}` : 'Aucun (Général)')}
                </span>
              </div>
            </div>

            {#if sug.reason}
              <p class="text-xs text-muted-foreground italic border-t border-purple-200/60 dark:border-purple-900/40 pt-2 mt-2">
                « {sug.reason} »
              </p>
            {/if}

            <div class="pt-1 flex justify-end">
              <Button
                size="sm"
                class="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
                disabled={state.isClosed || state.isSubmitting}
                onclick={() => state.handleMatchWithAI(
                  state.selectedTx!.id,
                  sug.memberId ? parseInt(sug.memberId) : null,
                  String(sug.category || '1')
                )}
              >
                <Check class="h-3.5 w-3.5" />
                <span>Valider cette suggestion</span>
              </Button>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Écritures liées existantes (Ventilation partielle) -->
      {#if state.linkedGlTxs.length > 0}
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-muted-foreground uppercase tracking-wider">Écritures comptables déjà liées ({state.linkedGlTxs.length})</span>
            <span class="font-medium">Total lié : {(state.totalLinked / 100).toFixed(2)} € / {(Math.abs(state.selectedTx.amount) / 100).toFixed(2)} €</span>
          </div>

          <div class="rounded-lg border border-border divide-y divide-border bg-card">
            {#each state.linkedGlTxs as gt}
              <div class="p-2.5 flex items-center justify-between text-xs">
                <div>
                  <div class="font-medium">{gt.description}</div>
                  <div class="text-[11px] text-muted-foreground">{gt.date} • {gt.type}</div>
                </div>

                <div class="flex items-center gap-3">
                  <span class="font-mono font-semibold">{(Math.abs(gt.amount) / 100).toFixed(2)} €</span>
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-destructive p-1 rounded"
                    disabled={state.isClosed || state.isSubmitting}
                    onclick={() => state.handleDeletePart(gt.id)}
                    title="Supprimer cette écriture"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            {/each}
          </div>

          {#if state.remainingAmount > 10}
            <div class="p-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md font-medium">
              Reste à rapprocher : {(state.remainingAmount / 100).toFixed(2)} €
            </div>
          {/if}
        </div>
      {/if}

      <!-- Onglets de rapprochement (Grand Livre vs Création directe vs Factures) -->
      <Tabs.Root bind:value={state.activeRightTab} class="w-full">
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
          <div class="space-y-4">
            {#if state.matchingInvoices.length > 0}
              <div class="space-y-2">
                <div class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Sparkles class="h-3.5 w-3.5" />
                  <span>Suggestion de Facture (Montant exact : {(state.selectedTx.amount / 100).toFixed(2)} €)</span>
                </div>
                <div class="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-2">
                  {#each state.matchingInvoices as inv}
                    <div class="flex items-center justify-between text-xs">
                      <div>
                        <div class="font-bold text-foreground">{inv.clientName}</div>
                        <div class="text-[11px] text-muted-foreground">{inv.invoiceNumber} • Du {inv.date}</div>
                        {#if inv.subject}
                          <div class="text-[11px] text-muted-foreground italic">{inv.subject}</div>
                        {/if}
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{(inv.totalAmount / 100).toFixed(2)} €</span>
                        <Button
                          size="sm"
                          class="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={state.isClosed || state.isSubmitting}
                          onclick={() => state.handleReconcile('create', state.selectedTx!, inv.id)}
                        >
                          Associer
                        </Button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Sélection multiple de factures ({state.selectedInvoiceIds.size} sélectionnée(s))</span>
                <span class="font-mono">Total : {(state.selectedSum / 100).toFixed(2)} € / {(state.selectedTx.amount / 100).toFixed(2)} €</span>
              </div>

              {#if state.otherUnpaidInvoices.length === 0 && state.matchingInvoices.length === 0}
                <div class="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  Aucune facture impayée trouvée pour cette saison.
                </div>
              {:else}
                <div class="rounded-lg border border-border divide-y divide-border bg-card max-h-[300px] overflow-y-auto">
                  {#each state.otherUnpaidInvoices as inv}
                    <div class="p-2.5 flex items-center justify-between text-xs hover:bg-muted/50 transition-colors">
                      <div class="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          class="invoice-checkbox h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          checked={state.selectedInvoiceIds.has(inv.id)}
                          onchange={() => state.toggleInvoiceSelection(inv.id)}
                        />
                        <div>
                          <div class="font-medium">{inv.clientName}</div>
                          <div class="text-[11px] text-muted-foreground">{inv.invoiceNumber} • {inv.date}</div>
                        </div>
                      </div>

                      <div class="flex items-center gap-3">
                        <span class="font-mono font-semibold">{(inv.totalAmount / 100).toFixed(2)} €</span>
                      </div>
                    </div>
                  {/each}
                </div>

                {#if state.selectedInvoiceIds.size > 0}
                  <div class="pt-2 flex justify-end">
                    <Button
                      id="btn-valider-association"
                      size="sm"
                      class="text-xs"
                      disabled={state.isClosed || state.isSubmitting || Math.abs(state.selectedSum - state.selectedTx.amount) > 10}
                      onclick={state.handleMultiInvoiceReconcile}
                    >
                      Rapprocher avec ces {state.selectedInvoiceIds.size} factures ({(state.selectedSum / 100).toFixed(2)} €)
                    </Button>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </Card.Root>
{/if}
