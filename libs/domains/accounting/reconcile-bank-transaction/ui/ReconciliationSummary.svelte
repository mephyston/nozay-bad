<script lang="ts">
  import { Trash2 } from 'lucide-svelte';
  import { Badge } from '@metacult/shared-ui';

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

<div class="space-y-4 border-b pb-4 mb-4">
  <h4 class="text-sm font-semibold text-gray-700">Détails de l'opération sélectionnée</h4>
  <div class="bg-gray-50 p-3 rounded-lg border text-sm space-y-2">
    <div>
      <span class="text-gray-500 font-medium">Libellé :</span>
      <span class="font-semibold text-gray-900">{selectedTx.name}</span>
    </div>
    {#if selectedTx.memo}
      <div>
        <span class="text-gray-500 font-medium">Mémo :</span>
        <span class="text-gray-700 italic">"{selectedTx.memo}"</span>
      </div>
    {/if}
    <div class="flex justify-between items-center pt-2 border-t text-xs">
      <div>
        <span class="text-gray-500 font-medium">Montant total :</span>
        <span class="font-semibold text-gray-900 ml-1">{(Math.abs(selectedTx.amount) / 100).toFixed(2)} €</span>
      </div>
      <div>
        <span class="text-gray-500 font-medium">Reste à rapprocher :</span>
        <span class="font-bold ml-1" class:text-green-600={remainingAmount === 0} class:text-orange-600={remainingAmount > 0}>
          {(remainingAmount / 100).toFixed(2)} €
        </span>
      </div>
    </div>
  </div>

  {#if linkedGlTxs.length > 0}
    <div class="space-y-2">
      <h5 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Écritures déjà rapprochées</h5>
      <div class="space-y-1">
        {#each linkedGlTxs as gt}
          <div class="flex justify-between items-center p-2 rounded bg-green-50 border border-green-200 text-xs">
            <div class="flex items-center gap-1.5 min-w-0">
              <Badge variant="success">{gt.type}</Badge>
              <span class="truncate text-gray-700 font-medium">{gt.description}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900">{(Math.abs(gt.amount) / 100).toFixed(2)} €</span>
              <button 
                onclick={() => onDeleteGlLink(gt.id)}
                class="text-red-500 hover:text-red-700"
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
