<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Badge } from '@nba/ui';

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
      <div>
        <span class="text-muted-foreground font-medium">Montant total :</span>
        <span class="font-semibold text-foreground ml-1">{(Math.abs(selectedTx.amount) / 100).toFixed(2)} €</span>
      </div>
      <div>
        <span class="text-muted-foreground font-medium">Reste à rapprocher :</span>
        <span class="font-bold ml-1" class:text-emerald-500={remainingAmount === 0} class:text-amber-500={remainingAmount > 0}>
          {(remainingAmount / 100).toFixed(2)} €
        </span>
      </div>
    </div>
  </div>

  {#if linkedGlTxs.length > 0}
    <div class="space-y-2">
      <h5 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Écritures déjà rapprochées</h5>
      <div class="space-y-1">
        {#each linkedGlTxs as gt}
          <div class="flex justify-between items-center p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <div class="flex items-center gap-1.5 min-w-0">
              <Badge variant="outline" class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">{gt.type}</Badge>
              <span class="truncate text-foreground font-medium">{gt.description}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-foreground">{(Math.abs(gt.amount) / 100).toFixed(2)} €</span>
              <button 
                onclick={() => onDeleteGlLink(gt.id)}
                class="text-destructive hover:text-destructive/80 transition-colors"
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
