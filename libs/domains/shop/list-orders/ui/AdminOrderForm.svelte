<script lang="ts">
  import { ShoppingBag } from '@lucide/svelte';
  import { FormField, FormSheet, SearchableCombobox, submitForm } from '@nba/ui';
  import type { Member, Product } from '../../list-products/ui/catalog-types';
  import { isOutOfStock, productLabel, type PaymentMethodOption } from '../../list-products/ui/catalog-types';
  import ShopCatalogProductSelect from '../../list-products/ui/ShopCatalogProductSelect.svelte';
  import ShopCatalogSummary from '../../list-products/ui/ShopCatalogSummary.svelte';
  import type { OrderItem } from './orders-manager-types';

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
   *
   * Le même formulaire **corrige** une commande encore ouverte quand on lui en passe une
   * (`commande`) : une autre taille, une quantité, le bon adhérent, le bon règlement. Le
   * serveur rend et reprend le stock réservé ; ici, on compte cette réservation dans ce
   * qui est disponible pour la commande, sinon la dernière unité qu'elle tient déjà
   * paraîtrait en rupture.
   */
  let {
    open = $bindable(false),
    products = [],
    members = [],
    activeSeasonId = '',
    paymentMethods = [],
    commande = null
  }: {
    open?: boolean;
    products: Product[];
    members: Member[];
    activeSeasonId: string;
    paymentMethods?: PaymentMethodOption[];
    /** La commande à corriger ; absente, le formulaire en crée une. */
    commande?: OrderItem | null;
  } = $props();

  const enEdition = $derived(commande !== null);

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
  /*
    Ce qu'une commande en attente de paiement a déjà retiré du stock lui reste acquis : sur
    son propre article, sa quantité s'ajoute au disponible. Le produit rendu ici porte ce
    disponible, et tout le formulaire — maximum, rupture, résumé — le lit sans le savoir.
  */
  const reserve = $derived(
    commande && commande.order.status === 'awaiting_payment' && Number(selectedProductId) === commande.order.productId
      ? commande.order.quantity
      : 0
  );
  const selectedProduct = $derived.by(() => {
    const brut = selectedProductId !== null ? (products.find((p) => p.id === Number(selectedProductId)) ?? null) : null;
    return brut && reserve > 0 ? { ...brut, stock: brut.stock + reserve } : brut;
  });

  /*
    Pré-remplissage, à chaque commande qu'on ouvre. La catégorie reprend celle de l'article
    commandé, pour que la liste d'articles le contienne ; faute de le retrouver (article
    retiré du catalogue), elle s'ouvre sur « toutes ».
  */
  $effect(() => {
    if (!open || !commande) return;
    const o = commande.order;
    selectedMemberId = o.memberId;
    selectedCategory = products.find((p) => p.id === o.productId)?.productCategoryId ?? 0;
    selectedProductId = o.productId;
    selectedQuantity = o.quantity;
    selectedPaymentMethod = o.paymentMethod;
    errorMessage = null;
  });
  const totalPriceCents = $derived(
    selectedProduct ? (selectedProduct.priceCents ?? (selectedProduct as { price?: number }).price ?? 0) * selectedQuantity : 0
  );
  const maxQuantity = $derived(
    selectedProduct ? (selectedProduct.trackStock ? Math.min(selectedProduct.stock, 99) : 99) : 1
  );

  /*
    Nom en entier, comme partout dans l'administration : « DURAND Camille ».

    La liste reprenait le format de l'espace adhérent, qui masque le nom (« D. Camille »)
    parce qu'un adhérent n'a pas à lire l'annuaire. Le bureau, lui, doit reconnaître
    l'acheteur : deux Camille D. ne se distinguaient que par leur licence. La licence
    passe en seconde ligne, où elle reste cherchable.
  */
  const memberItems = $derived(
    [...members]
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr'))
      .map((m) => ({ label: `${m.lastName.toUpperCase()} ${m.firstName}`, hint: m.licence, value: m.id }))
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

  async function modifier(): Promise<string> {
    const res = await fetch('/admin/api/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        id: commande!.order.id,
        memberId: Number(selectedMemberId),
        productId: selectedProduct!.id,
        quantity: selectedQuantity,
        paymentMethod: selectedPaymentMethod
      })
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      throw new Error(data.error || "La commande n'a pas pu être modifiée.");
    }
    return 'Commande modifiée.';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMessage = null;
    submitting = true;
    await submitForm({
      validate: empechement,
      submit: () => (enEdition ? modifier() : creer()),
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
  title={enEdition ? 'Modifier la commande' : 'Créer une commande'}
  icon={ShoppingBag}
  error={errorMessage}
  isSubmitting={submitting}
  submitLabel={enEdition ? 'Enregistrer' : 'Créer la commande'}
  submittingLabel={enEdition ? 'Enregistrement…' : 'Création…'}
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
