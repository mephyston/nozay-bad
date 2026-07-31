<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Badge, Amount, AlertDialog, Button } from '@nba/ui';

  let {
    selectedTx,
    linkedGlTxs = [],
    totalLinked = 0,
    remainingAmount = 0,
    onDeleteGlLink
  }: {
    selectedTx: any;
    linkedGlTxs: any[];
    totalLinked: number;
    remainingAmount: number;
    onDeleteGlLink: (glTxId: number) => void;
  } = $props();

  let entryToDelete = $state<number | null>(null);
  let showConfirmDialog = $state(false);

  function confirmDissociate(id: number) {
    entryToDelete = id;
    showConfirmDialog = true;
  }

  function handleConfirmedDelete() {
    if (entryToDelete !== null) {
      onDeleteGlLink(entryToDelete);
      entryToDelete = null;
      showConfirmDialog = false;
    }
  }
</script>

<div class="space-y-4 border-b border-border pb-4 mb-4">
  <h4 class="text-sm font-semibold text-foreground">Détails de l'opération sélectionnée</h4>
  <div class="bg-muted/40 p-3 rounded-lg border border-border text-sm space-y-2">
    <div>
      <span class="text-muted-foreground font-medium">Libellé :</span>
      <span class="font-semibold text-foreground">{selectedTx.name}</span>
    </div>
    {#if selectedTx.memo}
      <div>
        <span class="text-muted-foreground font-medium">Mémo :</span>
        <span class="text-foreground italic">"{selectedTx.memo}"</span>
      </div>
    {/if}
    <div class="flex justify-between items-center pt-2 border-t border-border text-xs">
      <div class="flex items-center gap-1">
        <span class="text-muted-foreground font-medium">Montant total :</span>
        <Amount cents={Math.abs(selectedTx.amount)} class="font-semibold text-foreground" />
      </div>
      <div class="flex items-center gap-1">
        <span class="text-muted-foreground font-medium">Reste à rapprocher :</span>
        <span class="font-bold" class:text-success={remainingAmount === 0} class:text-warning={remainingAmount > 0}>
          <Amount cents={remainingAmount} />
        </span>
      </div>
    </div>
  </div>

  {#if linkedGlTxs.length > 0}
    <div class="space-y-2">
      <h5 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Écritures déjà rapprochées</h5>
      <div class="space-y-1">
        {#each linkedGlTxs as gt}
          <div class="flex justify-between items-center p-2 rounded bg-success/10 border border-success/20 text-xs">
            <div class="flex items-center gap-1.5 min-w-0">
              <Badge variant="outline" class="bg-success/10 text-success border-success/20">{gt.type}</Badge>
              <span class="truncate text-foreground font-medium">{gt.description}</span>
            </div>
            <div class="flex items-center gap-2">
              <Amount cents={Math.abs(gt.amount)} class="font-semibold text-foreground" />
              <button 
                onclick={() => confirmDissociate(gt.id)}
                class="text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                title="Supprimer ce rapprochement"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

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
      <Button variant="destructive" onclick={handleConfirmedDelete} class="font-bold">
        Dissocier
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
