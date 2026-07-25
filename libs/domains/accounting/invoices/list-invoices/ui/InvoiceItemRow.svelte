<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Button, Input } from '@nba/ui';
  import type { InvoiceFormItem } from './invoices-types';

  let {
    item,
    index,
    isClosed = false,
    onRemove
  }: {
    item: InvoiceFormItem;
    index: number;
    isClosed?: boolean;
    onRemove: (index: number) => void;
  } = $props();
</script>

<div class="flex items-start gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
  <div class="flex-1 space-y-1.5">
    <label for={`desc-${index}`} class="sr-only">Description</label>
    <Input
      type="text"
      id={`desc-${index}`}
      bind:value={item.description}
      placeholder="Description de la ligne..."
      required
      disabled={isClosed}
    />
  </div>
  <div class="w-20 space-y-1.5">
    <label for={`qty-${index}`} class="sr-only">Quantité</label>
    <Input
      type="number"
      id={`qty-${index}`}
      bind:value={item.quantity}
      min="1"
      required
      disabled={isClosed}
    />
  </div>
  <div class="w-32 space-y-1.5">
    <label for={`price-${index}`} class="sr-only">Prix unitaire (€)</label>
    <Input
      type="text"
      id={`price-${index}`}
      bind:value={item.unitPriceStr}
      placeholder="0.00"
      required
      disabled={isClosed}
      class="font-outfit tabular-nums"
    />
  </div>
  {#if !isClosed}
    <Button type="button" variant="ghost" size="icon" onclick={() => onRemove(index)} class="text-destructive hover:bg-destructive/10 shrink-0">
      <Trash2 class="w-4 h-4" />
    </Button>
  {/if}
</div>
