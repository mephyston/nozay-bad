<script lang="ts">
  import { ChevronDown } from "@lucide/svelte";
  import { Button, Input, Label, Badge, SearchableCombobox } from '@nba/ui';
  import type { Product } from './catalog-types';
  import { paymentMethodsList, categoriesList } from './catalog-types';

  let {
    selectedPaymentMethod = $bindable('virement'),
    selectedCategory = $bindable(0),
    selectedProductId = $bindable(null),
    selectedQuantity = $bindable(1),
    filteredProducts,
    selectedProduct,
    maxQuantity,
    onIncrementQty,
    onDecrementQty
  }: {
    selectedPaymentMethod: string;
    selectedCategory: number;
    selectedProductId: number | null;
    selectedQuantity: number;
    filteredProducts: Product[];
    selectedProduct: Product | null;
    maxQuantity: number;
    onIncrementQty: () => void;
    onDecrementQty: () => void;
  } = $props();

  let strCategory = $state(selectedCategory.toString());
  $effect(() => {
    if (strCategory !== selectedCategory.toString()) {
      selectedCategory = Number(strCategory);
    }
  });
  $effect(() => {
    if (selectedCategory.toString() !== strCategory) {
      strCategory = selectedCategory.toString();
    }
  });

  let strProductId = $state(selectedProductId ? selectedProductId.toString() : '');
  $effect(() => {
    const val = strProductId ? Number(strProductId) : null;
    if (val !== selectedProductId) {
      selectedProductId = val;
    }
  });
  $effect(() => {
    const expected = selectedProductId ? selectedProductId.toString() : '';
    if (strProductId !== expected) {
      strProductId = expected;
    }
  });
</script>

<!-- Section 2: Mode de Paiement -->
<div class="space-y-2 pb-4 border-b border-border">
  <Label for="payment-method-select" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Mode de paiement</Label>
  <div class="relative">
    <SearchableCombobox
      items={paymentMethodsList.map(pm => ({ label: pm.label, value: pm.value }))}
      placeholder="Sélectionner..."
      bind:value={selectedPaymentMethod}
    />
  </div>
</div>

<!-- Section 3: Article & Quantité -->
<div class="space-y-4 pb-4 border-b border-border">
  <Label class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Article & Quantité</Label>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- Select 1: Type de produit -->
    <div class="space-y-1.5">
      <Label for="category-select" class="block text-xs font-semibold text-foreground">Type de produit</Label>
      <div class="relative">
        <SearchableCombobox
          items={categoriesList.map(c => ({ label: c.label, value: c.value.toString() }))}
          placeholder="Sélectionner un type..."
          bind:value={strCategory}
        />
      </div>
    </div>

    <!-- Select 2: Produit -->
    <div class="space-y-1.5">
      <Label for="product-select" class="block text-xs font-semibold text-foreground">Produit</Label>
      <div class="relative">
        <SearchableCombobox
          items={filteredProducts.map(p => ({
            label: `${p.name} — ${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(((p.priceCents ?? (p as any).price ?? 0)) / 100).replace(/\s/g, '\u00a0')} € (${p.stock > 0 ? `Stock: ${p.stock}` : 'Rupture'})`,
            value: p.id.toString()
          }))}
          placeholder={filteredProducts.length === 0 ? "Aucun article disponible" : "Sélectionner un produit..."}
          bind:value={strProductId}
        />
      </div>
    </div>
  </div>

  <!-- Quantity Selector -->
  <div class="space-y-1.5 pt-1">
    <Label for="quantity-input" class="block text-xs font-semibold text-foreground">Quantité</Label>
    <div class="flex items-center gap-2">
      <div class="flex items-center border border-border bg-background rounded-xl overflow-hidden shrink-0">
        <Button
          variant="ghost"
          onclick={onDecrementQty}
          disabled={selectedQuantity <= 1 || !selectedProduct || selectedProduct.stock <= 0}
          class="px-3 py-1 h-10 text-sm hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0"
        >
          -
        </Button>
        <Input
          id="quantity-input"
          type="number"
          min="1"
          max={maxQuantity}
          bind:value={selectedQuantity}
          disabled={!selectedProduct || selectedProduct.stock <= 0}
          class="w-12 h-10 text-center text-sm font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0"
        />
        <Button
          variant="ghost"
          onclick={onIncrementQty}
          disabled={!selectedProduct || selectedQuantity >= maxQuantity || selectedProduct.stock <= 0}
          class="px-3 py-1 h-10 text-sm hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0"
        >
          +
        </Button>
      </div>

      {#if selectedProduct}
        <div class="text-xs text-muted-foreground ml-2">
          {#if selectedProduct.stock <= 0}
            <Badge variant="destructive" class="text-[10px]">Rupture de stock</Badge>
          {:else}
            <span>Stock disponible : <strong class="text-foreground">{selectedProduct.stock}</strong></span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
