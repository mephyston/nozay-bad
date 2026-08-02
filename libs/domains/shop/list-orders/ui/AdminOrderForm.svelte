<script lang="ts">
  import { ShoppingBag, Check, CheckCircle, AlertCircle } from "@lucide/svelte";
  import { Button, Alert, Sheet } from '@nba/ui';
  import type { Member, Product } from '../../list-products/ui/catalog-types';
  import { formatMemberName } from '../../list-products/ui/catalog-utils';
  import { handleMemberKeyDown, submitOrder } from '../../list-products/ui/catalog-order-action';
  import ShopCatalogMemberSelect from '../../list-products/ui/ShopCatalogMemberSelect.svelte';
  import ShopCatalogProductSelect from '../../list-products/ui/ShopCatalogProductSelect.svelte';
  import ShopCatalogSummary from '../../list-products/ui/ShopCatalogSummary.svelte';

  let { products = [], members = [], activeSeasonId = '', onClose, onSuccess }: { products: Product[]; members: Member[]; activeSeasonId: string; onClose: () => void; onSuccess: (msg: string) => void; } = $props();

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

  function incrementQty() {
    if (selectedQuantity < maxQuantity) selectedQuantity += 1;
  }
  function decrementQty() {
    if (selectedQuantity > 1) selectedQuantity -= 1;
  }

  async function handleOrder(e: Event) {
    e.preventDefault();
    errorMessage = null; submitting = true;
    const res = await submitOrder({ selectedMemberId, selectedProduct, selectedQuantity, selectedPaymentMethod, activeSeasonId });
    submitting = false;
    if (res.success) { 
      onSuccess(res.message || "Commande créée avec succès.");
      selectedQuantity = 1; 
    }
    else errorMessage = res.error || null;
  }
</script>

<Sheet.Header class="p-6 border-b border-border">
  <Sheet.Title class="flex items-center gap-2">
    <ShoppingBag class="w-5 h-5 text-primary" />
    Créer une commande
  </Sheet.Title>
  <Sheet.Description class="hidden">Formulaire de création de commande (Admin).</Sheet.Description>
</Sheet.Header>

<form onsubmit={handleOrder} class="flex flex-col flex-1 overflow-hidden">
  <div class="p-6 overflow-y-auto space-y-6 flex-1">
    {#if errorMessage}
      <Alert.Root variant="destructive" class="p-4 text-sm flex items-start gap-2.5">
        <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <Alert.Description><span>{errorMessage}</span></Alert.Description>
      </Alert.Root>
    {/if}

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
    />

    <div class="flex justify-center my-4">
      <div class="cf-turnstile" data-sitekey="0x4AAAAAAD1TY7I_ql47XOjI" data-action="turnstile-spin-v1" data-size="invisible"></div>
    </div>
  </div>

  <Sheet.Footer class="p-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-end items-center gap-4 shrink-0">
    <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
      <Button type="button" variant="outline" onclick={onClose} disabled={submitting}>
        Annuler
      </Button>
      <Button type="submit" disabled={submitting || !selectedMemberId || !selectedProduct} class="gap-1.5 min-w-[120px]">
        {#if submitting}
          <div class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
          Validation...
        {:else}
          <Check class="w-4 h-4" /> Valider
        {/if}
      </Button>
    </div>
  </Sheet.Footer>
</form>
