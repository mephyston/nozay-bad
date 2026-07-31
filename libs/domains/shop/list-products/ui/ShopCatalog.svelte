<script module>
  export * from './catalog-types';
  export * from './catalog-utils';
  export * from './catalog-order-action';
</script>
<script lang="ts">
  import { ShoppingBag } from "@lucide/svelte";
  import { Card } from '@nba/ui';
  import type { Member, Product } from './catalog-types';
  import { formatMemberName } from './catalog-utils';
  import { handleMemberKeyDown, submitOrder } from './catalog-order-action';
  import ShopCatalogMemberSelect from './ShopCatalogMemberSelect.svelte';
  import ShopCatalogProductSelect from './ShopCatalogProductSelect.svelte';
  import ShopCatalogSummary from './ShopCatalogSummary.svelte';

  let { products = [], members = [], activeSeasonId = '' }: { products: Product[]; members: Member[]; activeSeasonId: string } = $props();

  let productsList = $derived(products);
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
  let successMessage = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  let filteredProducts = $derived(selectedCategory === 0 ? productsList : productsList.filter(p => p.productCategoryId === selectedCategory));
  let selectedProduct = $derived(selectedProductId !== null ? productsList.find(p => p.id === Number(selectedProductId)) || null : null);
  let totalPriceCents = $derived(selectedProduct ? (selectedProduct.priceCents ?? (selectedProduct as any).price ?? 0) * selectedQuantity : 0);
  let maxQuantity = $derived(selectedProduct ? (selectedProduct.trackStock ? Math.min(selectedProduct.stock, 99) : 99) : 1);

  $effect(() => {
    if (filteredProducts.length > 0) {
      const currentId = selectedProductId !== null ? Number(selectedProductId) : null;
      if (currentId === null || !filteredProducts.some(p => p.id === currentId)) selectedProductId = filteredProducts[0].id;
    } else selectedProductId = null;
  });

  $effect(() => {
    if (selectedProduct) {
      const max = selectedProduct.trackStock ? Math.min(selectedProduct.stock, 99) : 99;
      if (max > 0 && selectedQuantity > max) selectedQuantity = max;
      else if (selectedQuantity < 1) selectedQuantity = 1;
    }
  });

  $effect(() => { if (!isMemberDropdownOpen) highlightedIndex = -1; });
  $effect(() => { if (highlightedIndex >= filteredMembers.length) highlightedIndex = filteredMembers.length - 1; });

  $effect(() => {
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
    memberSearchQuery.trim() === ''
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
    errorMessage = null; successMessage = null; submitting = true;
    const res = await submitOrder({ selectedMemberId, selectedProduct, selectedQuantity, selectedPaymentMethod, activeSeasonId });
    submitting = false;
    if (res.success) { successMessage = res.message || null; selectedQuantity = 1; }
    else errorMessage = res.error || null;
  }
</script>

<Card.Root class="max-w-2xl mx-auto shadow-xl">
  <Card.Header class="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground flex flex-row items-center gap-4 rounded-t-xl">
    <div class="bg-primary-foreground/10 p-3 rounded-xl backdrop-blur-md">
      <ShoppingBag class="w-7 h-7 text-primary-foreground" />
    </div>
    <div>
      <Card.Title class="text-xl font-bold tracking-tight text-primary-foreground">Boutique Club</Card.Title>
      <p class="text-xs text-primary-foreground/80 mt-1">Commandez vos volants, cordages et équipements du club en quelques clics.</p>
    </div>
  </Card.Header>

  <Card.Content class="p-6 space-y-6">
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

    <ShopCatalogProductSelect
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

    <ShopCatalogSummary
      {selectedProduct}
      {selectedQuantity}
      {totalPriceCents}
      {selectedMemberId}
      {selectedMember}
      {submitting}
      {successMessage}
      {errorMessage}
      onOrder={handleOrder}
    />
  </Card.Content>
</Card.Root>
