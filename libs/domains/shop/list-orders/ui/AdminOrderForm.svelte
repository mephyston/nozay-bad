<script lang="ts">
  import { ShoppingBag, AlertCircle, Check } from '@lucide/svelte';
  import { Button, Alert, Sheet, Input, FormField } from '@nba/ui';
  import type { Member, Product } from '../../list-products/ui/catalog-types';
  import { formatMemberName } from '../../list-products/ui/catalog-utils';
  import { isOutOfStock } from '../../list-products/ui/catalog-types';
  import { handleMemberKeyDown } from '../../list-products/ui/catalog-order-action';
  import ShopCatalogProductSelect from '../../list-products/ui/ShopCatalogProductSelect.svelte';
  import ShopCatalogSummary from '../../list-products/ui/ShopCatalogSummary.svelte';

  let { products = [], members = [], activeSeasonId = '', onClose, onSuccess }: { products: Product[]; members: Member[]; activeSeasonId: string; onClose: () => void; onSuccess: (msg: string) => void; } = $props();

  let productsList = $derived(products);
  let selectedMemberId = $state<string>('');
  let memberSearchQuery = $state<string>('');
  let isMemberDropdownOpen = $state<boolean>(false);
  let highlightedIndex = $state<number>(-1);
  let lastSelectedMember = $state<Member | null>(null);

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
      ? sortedMembers
      : sortedMembers.filter(m =>
          `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          `${m.firstName} ${m.lastName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
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
    if (!selectedMemberId) { errorMessage = "Veuillez sélectionner un adhérent."; return; }
    if (!selectedProduct) { errorMessage = "Veuillez sélectionner un produit."; return; }

    errorMessage = null; submitting = true;
    try {
      const res = await fetch(window.location.pathname + window.location.search, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: activeSeasonId,
          memberId: parseInt(selectedMemberId),
          productId: selectedProduct.id,
          quantity: selectedQuantity,
          paymentMethod: selectedPaymentMethod
        })
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) {
        errorMessage = data.error || "Une erreur est survenue lors de l'enregistrement de la commande.";
      } else {
        onSuccess(data.message || "Commande créée avec succès.");
        selectedQuantity = 1;
      }
    } catch (err: any) {
      errorMessage = err.message || "Erreur réseau.";
    }
    submitting = false;
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

    <FormField id="order-member-input" label="Adhérent acheteur">
      <div class="relative">
        <Input
          id="order-member-input"
          type="text"
          placeholder="🔍 Rechercher un adhérent par nom ou licence..."
          class="pr-8 font-medium"
          value={isMemberDropdownOpen ? memberSearchQuery : memberDisplayVal}
          oninput={(e) => {
            isMemberDropdownOpen = true;
            memberSearchQuery = (e.target as HTMLInputElement).value;
          }}
          onfocus={() => {
            isMemberDropdownOpen = true;
            memberSearchQuery = '';
          }}
          onblur={() => {
            setTimeout(() => { isMemberDropdownOpen = false; }, 200);
          }}
          onkeydown={handleKeyDown}
        />
        {#if selectedMemberId}
          <Button
            variant="ghost"
            size="icon-xs"
            onclick={() => {
              selectedMemberId = '';
              memberSearchQuery = '';
              lastSelectedMember = null;
            }}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Effacer la sélection"
          >
            ✕
          </Button>
        {/if}

        {#if isMemberDropdownOpen}
          <div class="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg divide-y divide-border">
            {#each filteredMembers as member, idx}
              <Button
                variant="ghost"
                class="w-full text-left justify-start rounded-none px-3 py-2 text-sm text-foreground transition-colors font-medium border-0 cursor-pointer {idx === highlightedIndex ? 'bg-muted' : 'bg-popover'} hover:bg-muted"
                onmousedown={() => selectMember(member)}
              >
                {member.lastName} {member.firstName} ({member.licence})
              </Button>
            {:else}
              <div class="px-3 py-2 text-xs text-muted-foreground italic bg-popover">Aucun adhérent trouvé</div>
            {/each}
          </div>
        {/if}
      </div>
    </FormField>

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
      {totalPriceCents}
    />


  </div>

  <Sheet.Footer class="p-6 border-t border-border bg-muted/30 flex justify-end gap-2 shrink-0">
    <Button
      type="button"
      variant="outline"
      onclick={onClose}
      disabled={submitting}
    >
      Annuler
    </Button>
    <Button
      type="button"
      onclick={handleOrder}
      disabled={submitting || blockingReason !== null}
      class="flex items-center gap-2"
    >
      {#if submitting}
        <div class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <Check class="w-4 h-4" />
      {/if}
      Valider
    </Button>
  </Sheet.Footer>
</form>
