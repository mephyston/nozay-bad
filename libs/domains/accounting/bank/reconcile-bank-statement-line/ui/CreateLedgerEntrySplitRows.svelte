<script lang="ts">
  import { Button, Badge } from '@nba/ui';
  import { Trash2, Plus, Split } from '@lucide/svelte';

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

  const isComplete = $derived(Math.abs(splitSum - remainingAmount) < 1);
</script>

<div class="space-y-4 p-4 bg-muted/30 border border-border rounded-xl">
  <div class="flex items-center justify-between border-b border-border/60 pb-3">
    <div class="flex items-center gap-2">
      <Split class="w-4 h-4 text-primary" />
      <span class="text-xs font-bold text-foreground">Ventilation des montants par catégorie</span>
    </div>
    <div class="text-xs font-medium flex items-center gap-2">
      <span class="text-muted-foreground">Total ventilé :</span>
      <Badge variant={isComplete ? "default" : "destructive"} class="font-outfit tabular-nums text-xs">
        {(splitSum / 100).toFixed(2)} € / {(remainingAmount / 100).toFixed(2)} €
      </Badge>
    </div>
  </div>

  <div class="space-y-2.5">
    {#each splits as sp, idx}
      <div class="flex items-center gap-3 bg-background p-2.5 rounded-lg border border-border/70 shadow-sm">
        <div class="flex-1">
          <label for="split-cat-{idx}" class="sr-only">Catégorie</label>
          <select 
            id="split-cat-{idx}"
            bind:value={sp.category}
            class="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
          >
            {#each categories as cat}
              <option value={cat.id}>{cat.name || cat.adminLabel || `Catégorie ${cat.id}`}</option>
            {/each}
          </select>
        </div>

        <div class="w-32 relative flex items-center">
          <label for="split-amount-{idx}" class="sr-only">Montant en €</label>
          <input 
            type="number" 
            step="0.01"
            id="split-amount-{idx}"
            placeholder="0.00" 
            bind:value={sp.amount}
            class="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-outfit tabular-nums text-right focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <span class="absolute right-2 text-xs text-muted-foreground pointer-events-none">€</span>
        </div>

        <button 
          type="button" 
          onclick={() => removeSplitRow(idx)}
          class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          title="Supprimer la ligne de ventilation"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    {/each}
  </div>

  <div class="pt-1">
    <Button 
      type="button" 
      variant="outline"
      size="sm"
      onclick={addSplitRow}
      class="w-full text-xs gap-1.5 border-dashed"
    >
      <Plus class="w-3.5 h-3.5" />
      <span>Ajouter une ligne de ventilation</span>
    </Button>
  </div>
</div>
