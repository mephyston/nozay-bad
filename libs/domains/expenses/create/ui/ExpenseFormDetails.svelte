<script lang="ts">
  import { Input, Label } from '@nba/ui';

  let {
    category = $bindable(''),
    amountStr = $bindable(''),
    description = $bindable(''),
    visibleCategories = []
  }: {
    category: string;
    amountStr: string;
    description: string;
    visibleCategories: { value: string; label: string }[];
  } = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div class="space-y-1.5">
    <Label for="category" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Catégorie de dépense</Label>
    <select
      id="category"
      bind:value={category}
      class="w-full px-3 h-10 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
    >
      {#each visibleCategories as cat}
        <option value={cat.value}>{cat.label}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5">
    <Label for="amount" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant (€)</Label>
    <Input
      type="number"
      id="amount"
      step="0.01"
      min="0.01"
      placeholder="0.00"
      bind:value={amountStr}
      class="w-full h-10 rounded-xl font-semibold"
      required
    />
  </div>
</div>

<div class="space-y-1.5">
  <Label for="description" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Description / Motif des frais</Label>
  <textarea
    id="description"
    bind:value={description}
    rows="3"
    placeholder="Ex: Achat de volants de compétition pour le tournoi régional."
    class="w-full px-3 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
    required
  ></textarea>
</div>
