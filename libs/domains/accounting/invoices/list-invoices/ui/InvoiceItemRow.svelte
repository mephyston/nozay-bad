<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Button, Input, FormField } from '@nba/ui';
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
    <div class="flex-1">
    <FormField id={`desc-${index}`} label="Description" class="sr-only">
    <Input
      type="text"
      id={`desc-${index}`}
      bind:value={item.description}
      placeholder="Description de la ligne..."
      required
      disabled={isClosed}
    />
    </FormField>
  </div>
    <div class="w-20">
    <FormField id={`qty-${index}`} label="Quantité" class="sr-only">
    <Input
      type="number"
      id={`qty-${index}`}
      bind:value={item.quantity}
      min="1"
      required
      disabled={isClosed}
    />
    </FormField>
  </div>
    <div class="w-32">
    <FormField id={`price-${index}`} label="Prix unitaire (€)" class="sr-only">
    <Input
      type="text"
      id={`price-${index}`}
      bind:value={item.unitPriceStr}
      placeholder="0.00"
      required
      disabled={isClosed}
      class="font-outfit tabular-nums"
    />
    </FormField>
  </div>
  {#if !isClosed}
    <Button type="button" variant="ghost" size="icon" onclick={() => onRemove(index)} class="text-destructive hover:bg-destructive/10 shrink-0">
      <Trash2 class="w-4 h-4" />
    </Button>
  {/if}
</div>
