<script lang="ts">
  let {
    splits = $bindable([]),
    remainingAmount = 0,
    splitSum = 0,
    categories = [],
    addSplitRow,
    removeSplitRow
  }: {
    splits: { category: string; amount: number }[];
    remainingAmount: number;
    splitSum: number;
    categories: any[];
    addSplitRow: () => void;
    removeSplitRow: (idx: number) => void;
  } = $props();
</script>

<div class="space-y-3 bg-gray-50 p-3 rounded-lg border">
  <div class="text-xs font-semibold text-gray-500 flex justify-between">
    <span>Ventilation des montants</span>
    <span class:text-red-500={splitSum !== remainingAmount} class:text-green-600={splitSum === remainingAmount}>
      Total ventilé : {(splitSum / 100).toFixed(2)} € / {(remainingAmount / 100).toFixed(2)} €
    </span>
  </div>

  {#each splits as sp, idx}
    <div class="flex items-center gap-2">
      <select 
        bind:value={sp.category}
        class="flex-1 bg-white border rounded px-2 py-1 text-xs text-gray-700"
      >
        {#each categories as cat}
          <option value={cat.id}>{cat.name}</option>
        {/each}
      </select>
      <input 
        type="number" 
        id="split-amount-{idx}"
        placeholder="Montant en cents" 
        bind:value={sp.amount}
        class="w-24 bg-white border rounded px-2 py-1 text-xs text-gray-700"
      />
      <button 
        type="button" 
        onclick={() => removeSplitRow(idx)}
        class="text-red-500 hover:text-red-700 text-xs"
      >
        Retirer
      </button>
    </div>
  {/each}

  <button 
    type="button" 
    onclick={addSplitRow}
    class="text-blue-500 hover:text-blue-700 text-xs font-medium"
  >
    + Ajouter une ligne de ventilation
  </button>
</div>
