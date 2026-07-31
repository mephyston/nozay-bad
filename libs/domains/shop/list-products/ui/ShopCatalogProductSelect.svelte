<script lang="ts">
  import { ChevronDown } from "@lucide/svelte";
  import { Button, Input, Label, Badge, SearchableCombobox, FormField } from '@nba/ui';
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

  // Le SearchableCombobox préserve le type de valeur : on binde directement les
  // props numériques, sans variables-pont ni effets de synchronisation (qui
  // provoquaient une boucle effect_update_depth_exceeded avec l'auto-sélection
  // du produit dans ShopCatalog).
  const categoryItems = $derived(categoriesList.map((c) => ({ label: c.label, value: c.value })));
  const productItems = $derived(
    filteredProducts.map((p) => ({
      label: `${p.name} — ${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(((p.priceCents ?? (p as any).price ?? 0)) / 100).replace(/\s/g, ' ')} €${p.trackStock ? ` (${p.stock > 0 ? `Stock: ${p.stock}` : 'Rupture'})` : ''}`,
      value: p.id
    }))
  );
</script>

<!-- Section 2: Mode de Paiement -->
  <div class="pb-4 border-b border-border">
  <FormField id="payment-method-select" label="Mode de paiement">
  <div class="relative">
    <SearchableCombobox
      items={paymentMethodsList.map(pm => ({ label: pm.label, value: pm.value }))}
      placeholder="Sélectionner..."
      bind:value={selectedPaymentMethod}
    />
  </div>
  </FormField>
</div>

<!-- Section 3: Article & Quantité -->
<div class="space-y-4 pb-4 border-b border-border">
  <h3 class="text-xs font-bold text-muted-foreground uppercase">Article & Quantité</h3>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- Select 1: Type de produit -->
      <FormField id="category-select" label="Type de produit">
      <div class="relative">
        <SearchableCombobox
          items={categoryItems}
          placeholder="Sélectionner un type..."
          bind:value={selectedCategory}
        />
      </div>
    </FormField>

    <!-- Select 2: Produit -->
      <FormField id="product-select" label="Produit">
      <div class="relative">
        <SearchableCombobox
          items={productItems}
          placeholder={filteredProducts.length === 0 ? "Aucun article disponible" : "Sélectionner un produit..."}
          bind:value={selectedProductId}
        />
      </div>
    </FormField>
  </div>

  <!-- Quantity Selector -->
    <div class="pt-1">
    <FormField id="quantity-input" label="Quantité">
    <div class="flex items-center gap-2">
      <div class="flex items-center border border-border bg-background rounded-xl overflow-hidden shrink-0">
        <Button
          variant="ghost"
          onclick={onDecrementQty}
          disabled={selectedQuantity <= 1 || !selectedProduct || (selectedProduct.trackStock && selectedProduct.stock <= 0)}
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
          disabled={!selectedProduct || (selectedProduct.trackStock && selectedProduct.stock <= 0)}
          class="w-12 h-10 text-center text-sm font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0"
        />
        <Button
          variant="ghost"
          onclick={onIncrementQty}
          disabled={!selectedProduct || selectedQuantity >= maxQuantity || (selectedProduct.trackStock && selectedProduct.stock <= 0)}
          class="px-3 py-1 h-10 text-sm hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0"
        >
          +
        </Button>
      </div>

      {#if selectedProduct && selectedProduct.trackStock}
        <div class="text-xs text-muted-foreground ml-2">
          {#if selectedProduct.stock <= 0}
            <Badge variant="destructive" size="xs">Rupture de stock</Badge>
          {:else}
            <span>Stock disponible : <strong class="text-foreground">{selectedProduct.stock}</strong></span>
          {/if}
        </div>
      {/if}
    </div>
    </FormField>
  </div>
</div>
