<script module>
  export * from './catalog-types';
  export * from './catalog-utils';
  export * from './catalog-order-action';
</script>
<script lang="ts">
  import { ShoppingBag, Info, AlertCircle } from "@lucide/svelte";
  import { Card, Button, Alert } from '@nba/ui';
  import type { Member, OrderConfirmation, Product } from './catalog-types';
  import { isOutOfStock, maxOrderableQuantity } from './catalog-types';
  import { formatMemberName } from './catalog-utils';
  import { handleMemberKeyDown, submitOrder } from './catalog-order-action';
  import ShopCatalogMemberSelect from './ShopCatalogMemberSelect.svelte';
  import ShopCatalogProductSelect from './ShopCatalogProductSelect.svelte';
  import ShopCatalogSummary from './ShopCatalogSummary.svelte';
  import ShopCatalogConfirmation from './ShopCatalogConfirmation.svelte';

  let { products = [], members = [], activeSeasonId = '', lockToMembers = false, initialMemberId = '' }: { products: Product[]; members: Member[]; activeSeasonId: string; lockToMembers?: boolean; initialMemberId?: string } = $props();

  // Les articles en rupture ne sont pas proposés à la commande : inutile de les
  // laisser sélectionner pour bloquer ensuite le bouton. Les articles dont le stock
  // n'est pas suivi (trackStock = false) restent toujours disponibles.
  let productsList = $derived(products.filter((p) => !isOutOfStock(p)));
  let outOfStockCount = $derived(products.length - productsList.length);
  let selectedMemberId = $state<string>('');
  let memberSearchQuery = $state<string>('');
  let isMemberDropdownOpen = $state<boolean>(false);
  let highlightedIndex = $state<number>(-1);
  let lastSelectedMember = $state<Member | null>(null);
  let fetchedMembers = $state<Member[]>([]);
  let debounceTimeout: any;

  let selectedCategory = $state<number>(0);
  let selectedProductId = $state<number | null>(null);
  let selectedQuantity = $state<number>(1);
  let selectedPaymentMethod = $state<string>('virement');
  let submitting = $state<boolean>(false);
  let errorMessage = $state<string | null>(null);
  /** Commande venant d'être enregistrée ; non nulle, elle ouvre la boîte de confirmation. */
  let confirmation = $state<OrderConfirmation | null>(null);

  let filteredProducts = $derived(selectedCategory === 0 ? productsList : productsList.filter(p => p.productCategoryId === selectedCategory));
  let selectedProduct = $derived(selectedProductId !== null ? productsList.find(p => p.id === Number(selectedProductId)) || null : null);
  let totalPriceCents = $derived(selectedProduct ? (selectedProduct.priceCents ?? (selectedProduct as any).price ?? 0) * selectedQuantity : 0);
  let maxQuantity = $derived(maxOrderableQuantity(selectedProduct));

  $effect(() => {
    if (filteredProducts.length > 0) {
      const currentId = selectedProductId !== null ? Number(selectedProductId) : null;
      if (currentId === null || !filteredProducts.some(p => p.id === currentId)) selectedProductId = filteredProducts[0].id;
    } else selectedProductId = null;
  });

  $effect(() => {
    if (selectedProduct) {
      const max = maxOrderableQuantity(selectedProduct);
      if (max > 0 && selectedQuantity > max) selectedQuantity = max;
      else if (selectedQuantity < 1) selectedQuantity = 1;
    }
  });

  let blockingReason = $derived.by(() => {
    if (!selectedMemberId) return "Sélectionnez l'adhérent pour lequel commander.";
    if (!selectedProduct) return 'Sélectionnez un article pour continuer.';
    if (isOutOfStock(selectedProduct)) return `« ${selectedProduct.name} » est en rupture de stock.`;
    if (selectedProduct.trackStock && selectedQuantity > selectedProduct.stock) {
      return `Stock insuffisant : il ne reste que ${selectedProduct.stock} « ${selectedProduct.name} ».`;
    }
    return null;
  });

  $effect(() => { if (!isMemberDropdownOpen) highlightedIndex = -1; });
  $effect(() => { if (highlightedIndex >= filteredMembers.length) highlightedIndex = filteredMembers.length - 1; });

  // Présélection (foyer connecté) au montage.
  $effect(() => {
    if (initialMemberId && !selectedMemberId && !lastSelectedMember) {
      const m = members.find((mm) => mm.id.toString() === initialMemberId);
      if (m) {
        selectedMemberId = m.id.toString();
        lastSelectedMember = m;
        memberSearchQuery = formatMemberName(m);
      }
    }
  });

  $effect(() => {
    if (lockToMembers) return; // Foyer verrouillé : pas de recherche globale.
    if (!isMemberDropdownOpen) return;
    const query = memberSearchQuery.trim();
    if (lastSelectedMember && memberSearchQuery === formatMemberName(lastSelectedMember)) return;
    if (query.length > 0 && query.length < 3) return;

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/members-search?q=${encodeURIComponent(query)}`);
        if (response.ok) fetchedMembers = await response.json() as Member[];
      } catch (err) { console.error('Error fetching members from API:', err); }
    }, query === '' ? 0 : 300);

    return () => { if (debounceTimeout) clearTimeout(debounceTimeout); };
  });

  function selectMember(m: Member) {
    selectedMemberId = m.id.toString();
    lastSelectedMember = m;
    memberSearchQuery = formatMemberName(m);
    isMemberDropdownOpen = false;
    highlightedIndex = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') { isMemberDropdownOpen = false; e.preventDefault(); return; }
    handleMemberKeyDown(e, {
      isMemberDropdownOpen, highlightedIndex, filteredMembersCount: filteredMembers.length,
      onOpenDropdown: () => { isMemberDropdownOpen = true; highlightedIndex = 0; },
      onSelectMember: (idx) => {
        if (idx >= 0 && idx < filteredMembers.length) {
          if (e.key === 'Enter') selectMember(filteredMembers[idx]);
          else highlightedIndex = idx;
        }
      }
    });
  }

  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  let selectedMember = $derived(members.length > 0 ? (members.find(m => m.id.toString() === selectedMemberId) || null) : lastSelectedMember);
  let memberDisplayVal = $derived(selectedMember ? formatMemberName(selectedMember) : '');
  let filteredMembers = $derived(
    lockToMembers
      ? sortedMembers
      : memberSearchQuery.trim() === ''
      ? (fetchedMembers.length > 0 ? fetchedMembers : sortedMembers)
      : (fetchedMembers.length > 0
          ? fetchedMembers
          : sortedMembers.filter(m =>
              `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
              `${m.firstName} ${m.lastName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
            )
        )
  );

  function incrementQty() { if (selectedQuantity < maxQuantity) selectedQuantity += 1; }
  function decrementQty() { if (selectedQuantity > 1) selectedQuantity -= 1; }

  async function handleOrder() {
    errorMessage = null; submitting = true;
    // Le récapitulatif est figé avant l'appel : la remise à zéro qui suivra la
    // fermeture de la boîte ne doit pas en réécrire le contenu sous les yeux.
    const ordered: OrderConfirmation = {
      memberName: selectedMember ? formatMemberName(selectedMember) : '',
      productName: selectedProduct?.name ?? '',
      quantity: selectedQuantity,
      totalCents: totalPriceCents,
      paymentMethod: selectedPaymentMethod
    };
    const res = await submitOrder({ selectedMemberId, selectedProduct, selectedQuantity, selectedPaymentMethod, activeSeasonId });
    submitting = false;
    if (res.success) confirmation = ordered;
    else errorMessage = res.error || null;
  }

  /**
   * Remise à zéro de la commande, déclenchée par la fermeture de la confirmation.
   *
   * L'adhérent n'est pas touché : dans la boutique il vient de la session et serait
   * aussitôt resélectionné ; ailleurs, on enchaîne d'ordinaire pour la même personne.
   * `selectedProductId = null` laisse l'effet de sélection reposer le premier article
   * du catalogue, exactement comme au chargement de la page.
   */
  function resetOrderForm() {
    selectedQuantity = 1;
    selectedCategory = 0;
    selectedProductId = null;
    selectedPaymentMethod = 'virement';
    errorMessage = null;
  }
</script>

<Card.Root class="max-w-2xl mx-auto shadow-sm">
  <Card.Header class="px-5 py-4 border-b border-border flex flex-row items-center gap-3">
    <ShoppingBag class="w-5 h-5 text-primary shrink-0" />
    <div>
      <Card.Title class="text-base font-semibold text-foreground">Boutique du club</Card.Title>
      <p class="text-xs text-muted-foreground mt-0.5">Commandez vos volants, cordages et équipements du club.</p>
    </div>
  </Card.Header>

  <Card.Content class="p-3 sm:p-6 space-y-3 sm:space-y-6">
    {#if lockToMembers}
      <div class="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
        <span class="text-muted-foreground">Adhérent : </span>
        <span class="font-semibold text-foreground">{selectedMember ? formatMemberName(selectedMember) : '—'}</span>
      </div>
    {:else}
      <ShopCatalogMemberSelect
        bind:selectedMemberId
        bind:memberSearchQuery
        bind:isMemberDropdownOpen
        bind:highlightedIndex
        {selectedMember}
        {memberDisplayVal}
        {filteredMembers}
        onSelectMember={selectMember}
        onKeyDown={handleKeyDown}
      />
    {/if}

    <ShopCatalogProductSelect
      bind:selectedPaymentMethod
      bind:selectedCategory
      bind:selectedProductId
      bind:selectedQuantity
      {filteredProducts}
      {selectedProduct}
      {maxQuantity}
      {outOfStockCount}
      onIncrementQty={incrementQty}
      onDecrementQty={decrementQty}
    />

    <ShopCatalogSummary
      {selectedProduct}
      {totalPriceCents}
    />

    <!-- Submit Button -->
    <Button
      onclick={handleOrder}
      disabled={blockingReason !== null || submitting}
      class="w-full flex justify-center items-center gap-2 font-bold h-11 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
    >
      {#if submitting}
        <span class="animate-pulse">Envoi de la commande...</span>
      {:else}
        <ShoppingBag class="w-4 h-4" />
        Valider la commande
      {/if}
    </Button>

    {#if blockingReason && !submitting}
      <p class="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info class="w-3.5 h-3.5 shrink-0 mt-px" />
        <span>{blockingReason}</span>
      </p>
    {/if}

    <!--
      La confirmation n'est plus un encart sous le bouton : elle passait sous la ligne
      de flottaison sur mobile, et ne disait rien de ce qui restait à faire — remettre
      les espèces, notamment. Seul l'échec reste annoncé sur place, à côté du bouton
      qu'il faudra presser de nouveau.
    -->
    <ShopCatalogConfirmation bind:confirmation onAcknowledge={resetOrderForm} />

    {#if errorMessage}
      <Alert.Root variant="destructive">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
      <Alert.Description>{errorMessage}</Alert.Description>
      </Alert.Root>
    {/if}
  </Card.Content>
</Card.Root>
