<script lang="ts">
  import { Button, Input, Badge, SearchableCombobox, FormField } from '@nba/ui';
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
    outOfStockCount = 0,
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
    /** Articles masqués car en rupture — signalé pour éviter l'effet « article disparu ». */
    outOfStockCount?: number;
    onIncrementQty: () => void;
    onDecrementQty: () => void;
  } = $props();

  // Un seul combobox produit : tous les produits, triés par type puis nom, avec le
  // type préfixé dans le libellé (« Volants · … ») pour les regrouper visuellement.
  const productItems = $derived(
    [...filteredProducts]
      .sort((a, b) => (a.productCategoryId - b.productCategoryId) || a.name.localeCompare(b.name))
      .map((p) => {
        const type = categoriesList.find((c) => c.value === p.productCategoryId)?.label;
        const price = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((p.priceCents ?? (p as any).price ?? 0) / 100);
        const stock = p.trackStock ? ` (${p.stock > 0 ? `Stock: ${p.stock}` : 'Rupture'})` : '';
        return { label: `${type ? `${type} · ` : ''}${p.name} — ${price} €${stock}`, value: p.id };
      })
  );
</script>

<!-- Section : Article & Quantité (produit + quantité sur la même ligne) -->
<div class="space-y-3 pb-4 border-b border-border">
  <div class="flex items-end gap-3">
    <div class="flex-1 min-w-0">
      <FormField id="product-select" label="Produit">
        <SearchableCombobox
          items={productItems}
          placeholder={filteredProducts.length === 0 ? 'Aucun article disponible' : 'Sélectionner un produit...'}
          bind:value={selectedProductId}
        />
      </FormField>
    </div>

    <div class="shrink-0">
    <FormField id="quantity-input" label="Qté">
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
    </FormField>
    </div>
  </div>

  {#if selectedProduct && selectedProduct.trackStock}
    <div class="text-xs text-muted-foreground">
      {#if selectedProduct.stock <= 0}
        <Badge variant="destructive" size="xs">Rupture de stock</Badge>
      {:else}
        <span>Stock disponible : <strong class="text-foreground">{selectedProduct.stock}</strong></span>
      {/if}
    </div>
  {/if}

  {#if outOfStockCount > 0}
    <p class="text-xs text-muted-foreground">
      {outOfStockCount === 1
        ? "1 article en rupture de stock n'est pas proposé à la commande."
        : `${outOfStockCount} articles en rupture de stock ne sont pas proposés à la commande.`}
    </p>
  {/if}
</div>

<!-- Section : Mode de Paiement -->
<div class="pb-1">
  <FormField id="payment-method-select" label="Mode de paiement">
    <SearchableCombobox
      items={paymentMethodsList.map((pm) => ({ label: pm.label, value: pm.value }))}
      placeholder="Sélectionner..."
      bind:value={selectedPaymentMethod}
    />
  </FormField>
</div>
