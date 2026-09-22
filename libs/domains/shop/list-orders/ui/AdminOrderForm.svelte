<script lang="ts">
  import { ShoppingBag } from '@lucide/svelte';
  import { FormField, FormSheet, SearchableCombobox, submitForm } from '@nba/ui';
  import type { Member, Product } from '../../list-products/ui/catalog-types';
  import { formatMemberName } from '../../list-products/ui/catalog-utils';
  import { isOutOfStock, productLabel, type PaymentMethodOption } from '../../list-products/ui/catalog-types';
  import ShopCatalogProductSelect from '../../list-products/ui/ShopCatalogProductSelect.svelte';
  import ShopCatalogSummary from '../../list-products/ui/ShopCatalogSummary.svelte';

  /**
   * Créer une commande au nom d'un adhérent, depuis le bureau.
   *
   * Le choix de l'adhérent passait par une liste déroulante écrite à la main —
   * `<input>`, panneau absolu, navigation au clavier, fermeture au `blur` différée de
   * 200 ms. `SearchableCombobox` fait tout cela, et au doigt il ouvre l'écran de choix
   * plein cadre au lieu d'un panneau de 240 px qui passait sous le clavier.
   *
   * La coquille est celle de tous les formulaires de l'admin : sur téléphone elle monte
   * du bas et porte ses actions dans sa barre de navigation, hors de portée du clavier.
   */
  let {
    open = $bindable(false),
    products = [],
    members = [],
    activeSeasonId = '',
    paymentMethods = []
  }: {
    open?: boolean;
    products: Product[];
    members: Member[];
    activeSeasonId: string;
    paymentMethods?: PaymentMethodOption[];
  } = $props();

  let selectedMemberId = $state<string | number | undefined>(undefined);
  let selectedCategory = $state<number>(0);
  let selectedProductId = $state<number | null>(null);
  let selectedQuantity = $state<number>(1);
  let selectedPaymentMethod = $state<string>('');
  let submitting = $state<boolean>(false);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    if (!paymentMethods.some((pm) => pm.value === selectedPaymentMethod)) {
      selectedPaymentMethod = paymentMethods[0]?.value ?? '';
    }
  });

  const filteredProducts = $derived(
    selectedCategory === 0 ? products : products.filter((p) => p.productCategoryId === selectedCategory)
  );
  const selectedProduct = $derived(
    selectedProductId !== null ? (products.find((p) => p.id === Number(selectedProductId)) ?? null) : null
  );
  const totalPriceCents = $derived(
    selectedProduct ? (selectedProduct.priceCents ?? (selectedProduct as { price?: number }).price ?? 0) * selectedQuantity : 0
  );
  const maxQuantity = $derived(
    selectedProduct ? (selectedProduct.trackStock ? Math.min(selectedProduct.stock, 99) : 99) : 1
  );

  const memberItems = $derived(
    [...members]
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
      .map((m) => ({ label: `${formatMemberName(m)} (${m.licence})`, value: m.id }))
  );

  $effect(() => {
    if (filteredProducts.length > 0) {
      const currentId = selectedProductId !== null ? Number(selectedProductId) : null;
      if (currentId === null || !filteredProducts.some((p) => p.id === currentId)) {
        selectedProductId = filteredProducts[0].id;
      }
    } else selectedProductId = null;
  });

  $effect(() => {
    if (!selectedProduct) return;
    const max = selectedProduct.trackStock ? Math.min(selectedProduct.stock, 99) : 99;
    if (max > 0 && selectedQuantity > max) selectedQuantity = max;
    else if (selectedQuantity < 1) selectedQuantity = 1;
  });

  /**
   * Ce qui empêche d'enregistrer, dit en une phrase.
   *
   * Rendu à la soumission plutôt qu'en grisant le bouton : un bouton éteint ne dit
   * jamais pourquoi, et c'est précisément ce qu'on a besoin de savoir quand un article
   * vient de passer en rupture.
   */
  function empechement(): string | null {
    if (!selectedMemberId) return "Sélectionnez l'adhérent pour lequel commander.";
    if (!selectedProduct) return 'Sélectionnez un article pour continuer.';
    if (isOutOfStock(selectedProduct)) return `« ${productLabel(selectedProduct)} » est en rupture de stock.`;
    if (selectedProduct.trackStock && selectedQuantity > selectedProduct.stock) {
      return `Stock insuffisant : il ne reste que ${selectedProduct.stock} « ${productLabel(selectedProduct)} ».`;
    }
    return null;
  }

  function incrementQty() {
    if (selectedQuantity < maxQuantity) selectedQuantity += 1;
  }
  function decrementQty() {
    if (selectedQuantity > 1) selectedQuantity -= 1;
  }

  /*
    Le relais du domaine, et non la page hôte : `window.location.pathname` la visait,
    ce qui liait ce formulaire à l'écran qui l'affiche sans que rien ne le rappelle.
  */
  async function creer(): Promise<string> {
    const res = await fetch('/admin/api/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // La création se nomme : elle se reconnaissait jusqu'ici à la seule présence
        // d'un produit et d'une quantité, un implicite qui se serait défait à la
        // première évolution du formulaire.
        action: 'create-order',
        seasonId: activeSeasonId,
        memberId: Number(selectedMemberId),
        productId: selectedProduct!.id,
        quantity: selectedQuantity,
        paymentMethod: selectedPaymentMethod
      })
    });
    const data = (await res.json()) as { success?: boolean; error?: string; message?: string };
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement de la commande.");
    }
    return data.message || 'Commande créée.';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMessage = null;
    submitting = true;
    await submitForm({
      validate: empechement,
      submit: creer,
      success: (message) => message,
      close: () => {
        open = false;
        selectedQuantity = 1;
      },
      // La feuille couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => {
        errorMessage = message;
      }
    });
    submitting = false;
  }
</script>

<FormSheet
  bind:open
  title="Créer une commande"
  icon={ShoppingBag}
  error={errorMessage}
  isSubmitting={submitting}
  submitLabel="Créer la commande"
  submittingLabel="Création…"
  onSubmit={handleSubmit}
>
  <FormField id="order-member" label="Adhérent acheteur">
    <SearchableCombobox
      id="order-member"
      items={memberItems}
      bind:value={selectedMemberId}
      placeholder="Choisir un adhérent…"
      searchPlaceholder="Nom ou licence…"
      emptyText="Aucun adhérent trouvé."
    />
  </FormField>

  <ShopCatalogProductSelect
    {paymentMethods}
    bind:selectedPaymentMethod
    bind:selectedCategory
    bind:selectedProductId
    bind:selectedQuantity
    {filteredProducts}
    {selectedProduct}
    {maxQuantity}
    onIncrementQty={incrementQty}
    onDecrementQty={decrementQty}
  />

  <ShopCatalogSummary {selectedProduct} {totalPriceCents} />
</FormSheet>
