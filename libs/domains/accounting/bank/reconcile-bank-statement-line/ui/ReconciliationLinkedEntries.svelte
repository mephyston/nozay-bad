<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Amount } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  let { state, selectedTx }: { state: ReconciliationState; selectedTx: BankStatementLine } = $props();
</script>

{#if state.linkedGlTxs.length > 0}
  <div class="space-y-2">
    <div class="flex items-center justify-between text-xs">
      <span class="font-semibold text-muted-foreground uppercase tracking-wider">Écritures comptables déjà liées ({state.linkedGlTxs.length})</span>
      <span class="font-medium flex items-center gap-1">
        <span>Total lié :</span>
        <Amount cents={state.totalLinked} />
        <span>/</span>
        <Amount cents={Math.abs(selectedTx.amount)} />
      </span>
    </div>

    <div class="rounded-lg border border-border divide-y divide-border bg-card">
      {#each state.linkedGlTxs as gt}
        <div class="p-2.5 flex items-center justify-between text-xs">
          <div>
            <div class="font-medium">{gt.description}</div>
            <div class="text-[11px] text-muted-foreground">{gt.date} • {gt.type}</div>
          </div>

          <div class="flex items-center gap-3">
            <Amount cents={Math.abs(gt.amount)} class="font-semibold" />
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
      <div class="p-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md font-medium flex items-center gap-1">
        <span>Reste à rapprocher :</span>
        <Amount cents={state.remainingAmount} />
      </div>
    {/if}
  </div>
{/if}
