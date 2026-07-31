<script lang="ts">
  import { Sparkles } from '@lucide/svelte';
  import { Button, Amount } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  let { state = $bindable(), selectedTx }: { state: ReconciliationState; selectedTx: BankStatementLine } = $props();
</script>

<div class="space-y-4">
  {#if state.matchingInvoices.length > 0}
    <div class="space-y-2">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-success">
        <Sparkles class="h-3.5 w-3.5" />
        <span class="flex items-center gap-1">
          <span>Suggestion de Facture (Montant exact :</span>
          <Amount cents={selectedTx.amount} />
          <span>)</span>
        </span>
      </div>
      <div class="rounded-lg border border-success/20 bg-success/10 p-3 space-y-2">
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
              <Amount cents={inv.totalAmount} class="font-semibold" colorize={true} />
              <Button
                size="sm"
                class="h-7 text-xs bg-success/10 hover:bg-success/10 text-white"
                disabled={state.isClosed || state.isSubmitting}
                onclick={() => state.handleReconcile('create', selectedTx, inv.id)}
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
      <span class="flex items-center gap-1">
        <span>Total :</span>
        <Amount cents={state.selectedSum} />
        <span>/</span>
        <Amount cents={selectedTx.amount} />
      </span>
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
              <Amount cents={inv.totalAmount} class="font-semibold" />
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
            disabled={state.isClosed || state.isSubmitting || Math.abs(state.selectedSum - selectedTx.amount) > 10}
            onclick={state.handleMultiInvoiceReconcile}
          >
            <span class="flex items-center gap-1">
              <span>Rapprocher avec ces {state.selectedInvoiceIds.size} factures (</span>
              <Amount cents={state.selectedSum} />
              <span>)</span>
            </span>
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</div>
