<script lang="ts">
  import { Amount } from '@nba/ui';
  import { productLabel, type Product } from './catalog-types';

  let {
    selectedProduct,
    totalPriceCents,
  }: {
    selectedProduct: Product | null;
    totalPriceCents: number;
  } = $props();
</script>

<div class="space-y-4">
  <div class="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
    <div class="flex justify-between items-center text-sm font-semibold text-muted-foreground">
      <span>Article sélectionné :</span>
      <span class="text-foreground">{selectedProduct ? productLabel(selectedProduct) : '—'}</span>
    </div>
    <div class="flex justify-between items-center pt-2 border-t border-border/50">
      <span class="text-base font-bold text-foreground">Montant total :</span>
      <Amount cents={totalPriceCents ?? 0} class="text-xl font-extrabold text-primary" />
    </div>
  </div>
</div>
