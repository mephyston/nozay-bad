<script lang="ts">
  import { Button, Input, Badge, SearchableCombobox, FormField } from '@nba/ui';
  import type { Product } from './catalog-types';
  import { isOrderable, productLabel, type PaymentMethodOption } from './catalog-types';

  let {
    selectedPaymentMethod = $bindable(''),
    selectedCategory = $bindable(0),
    selectedProductId = $bindable(null),
    selectedQuantity = $bindable(1),
    filteredProducts,
    selectedProduct,
    maxQuantity,
    outOfStockCount = 0,
    paymentMethods = [],
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
    /** Moyens de paiement proposés ; tous par défaut, la boutique de l'adhérent en passe moins. */
    paymentMethods?: PaymentMethodOption[];
    onIncrementQty: () => void;
    onDecrementQty: () => void;
  } = $props();

  // Un seul combobox produit : tous les articles commandables — un parent qui a des
  // déclinaisons n'en fait pas partie, ce sont elles qu'on commande —, dans l'ordre
  // rendu par l'API (famille puis déclinaisons), la catégorie préfixée dans le libellé
  // (« Volants · … ») pour les regrouper visuellement.
  const productItems = $derived(
    filteredProducts
      .filter(isOrderable)
      .map((p) => {
        const type = p.categoryLabel;
        const price = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((p.priceCents ?? (p as any).price ?? 0) / 100);
        const stock = p.trackStock ? ` (${p.stock > 0 ? `Stock: ${p.stock}` : 'Rupture'})` : '';
        return { label: `${type ? `${type} · ` : ''}${productLabel(p)} — ${price} €${stock}`, value: p.id };
      })
  );
</script>

<!--
  Article et quantité.

  Côte à côte à la souris, l'un sous l'autre au doigt : un champ par ligne est la
  règle sur téléphone, et le pas-à-pas de quantité n'y tenait pas dans les 90 px que
  lui laissait le combobox.
-->
<div class="space-y-3 pb-4 border-b border-border">
  <div class="flex flex-col gap-3 md:flex-row md:items-end">
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
    <FormField id="quantity-input" label="Quantité">
      <div class="flex items-center justify-between border border-border bg-background rounded-xl overflow-hidden md:justify-start">
        <Button
          variant="ghost"
          onclick={onDecrementQty}
          disabled={selectedQuantity <= 1 || !selectedProduct || (selectedProduct.trackStock && selectedProduct.stock <= 0)}
          class="h-11 px-4 text-base hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0 md:h-10 md:px-3 md:text-sm"
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
          class="h-11 w-12 text-center text-base font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 md:h-10 md:text-sm"
        />
        <Button
          variant="ghost"
          onclick={onIncrementQty}
          disabled={!selectedProduct || selectedQuantity >= maxQuantity || (selectedProduct.trackStock && selectedProduct.stock <= 0)}
          class="h-11 px-4 text-base hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0 md:h-10 md:px-3 md:text-sm"
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
      items={paymentMethods.map((pm) => ({ label: pm.label, value: pm.value }))}
      placeholder="Sélectionner..."
      bind:value={selectedPaymentMethod}
    />
  </FormField>
</div>
