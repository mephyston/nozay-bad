<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Amount, AlertDialog } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  let { state: reconState, selectedTx }: { state: ReconciliationState; selectedTx: BankStatementLine } = $props();

  let entryToDelete = $state<number | null>(null);
  let showConfirmDialog = $state(false);

  function confirmDissociate(id: number) {
    entryToDelete = id;
    showConfirmDialog = true;
  }

  function handleConfirmedDelete() {
    if (entryToDelete !== null) {
      reconState.handleDeletePart(entryToDelete);
      entryToDelete = null;
      showConfirmDialog = false;
    }
  }
</script>

{#if reconState.linkedGlTxs.length > 0}
  <div class="space-y-2">
    <div class="flex items-center justify-between text-xs">
      <span class="font-semibold text-muted-foreground uppercase tracking-wider">Écritures comptables déjà liées ({reconState.linkedGlTxs.length})</span>
      <span class="font-medium flex items-center gap-1">
        <span>Total lié :</span>
        <Amount cents={reconState.totalLinked} />
        <span>/</span>
        <Amount cents={Math.abs(selectedTx.amount)} />
      </span>
    </div>

    <div class="rounded-lg border border-border divide-y divide-border bg-card">
      {#each reconState.linkedGlTxs as gt}
        <div class="p-2.5 flex items-center justify-between text-xs">
          <div>
            <div class="font-medium">{gt.description}</div>
            <div class="text-[11px] text-muted-foreground">{gt.date} • {gt.type}</div>
          </div>

          <div class="flex items-center gap-3">
            <Amount cents={Math.abs(gt.amount)} class="font-semibold" />
            <button
              type="button"
              class="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer transition-colors"
              disabled={reconState.isClosed || reconState.isSubmitting}
              onclick={() => confirmDissociate(gt.id)}
              title="Dissocier cette écriture"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      {/each}
    </div>

    {#if reconState.remainingAmount > 10}
      <div class="p-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md font-medium flex items-center gap-1">
        <span>Reste à rapprocher :</span>
        <Amount cents={reconState.remainingAmount} />
      </div>
    {/if}
  </div>
{/if}

<AlertDialog.Root bind:open={showConfirmDialog}>
  <AlertDialog.Content class="bg-card border-border">
    <AlertDialog.Header>
      <AlertDialog.Title>Dissocier l'écriture comptable ?</AlertDialog.Title>
      <AlertDialog.Description>
        Voulez-vous supprimer cette écriture liée ? Le solde de l'adhérent et le rapprochement seront mis à jour.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => showConfirmDialog = false}>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleConfirmedDelete} class="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold">
        Dissocier
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
