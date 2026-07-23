<script lang="ts">
  import { ShoppingBag, Search, Check, AlertCircle, ChevronDown } from "@lucide/svelte";
  import { Button, Card, Input, Label, Badge } from '@nba/ui';

  interface Member {
    id: number;
    firstName: string;
    lastName: string;
    licence: string;
  }

  interface Product {
    id: number;
    name: string;
    category: 'shuttlecock' | 'string' | 'other';
    price: number; // in cents
    stock: number;
    active: boolean;
  }

  let {
    products = [],
    members = [],
    activeSeasonId = ''
  }: {
    products: Product[];
    members: Member[];
    activeSeasonId: string;
  } = $props();

  const paymentMethodsList = [
    { value: 'virement', label: 'Virement' },
    { value: 'cheque', label: 'Chèque' },
    { value: 'especes', label: 'Espèces' },
    { value: 'labaz', label: 'Labaz' },
    { value: 'ancv', label: 'Chèque ANCV' },
    { value: 'pass_sport', label: 'Pass\'Sport' },
    { value: 'ticket_loisir', label: 'Ticket Loisir' },
    { value: 'up_loisir', label: 'Up Loisir' }
  ];

  const categoriesList = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'shuttlecock', label: 'Volants' },
    { value: 'string', label: 'Cordages' },
    { value: 'other', label: 'Autres' }
  ];

  let productsList = $derived(products);

  // Member selection state
  let selectedMemberId = $state<string>('');
  let memberSearchQuery = $state<string>('');
  let isMemberDropdownOpen = $state<boolean>(false);
  let highlightedIndex = $state<number>(-1);
  let lastSelectedMember = $state<Member | null>(null);
  let fetchedMembers = $state<Member[]>([]);
  let debounceTimeout: any;

  // Order form state
  let selectedCategory = $state<string>('all');
  let selectedProductId = $state<number | null>(null);
  let selectedQuantity = $state<number>(1);
  let selectedPaymentMethod = $state<string>('virement');
  let submitting = $state<boolean>(false);
  let successMessage = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  let filteredProducts = $derived(
    selectedCategory === 'all'
      ? productsList
      : productsList.filter(p => p.category === selectedCategory)
  );

  let selectedProduct = $derived(
    selectedProductId !== null
      ? productsList.find(p => p.id === Number(selectedProductId)) || null
      : null
  );

  let totalPriceCents = $derived(
    selectedProduct ? selectedProduct.price * selectedQuantity : 0
  );

  let maxQuantity = $derived(
    selectedProduct ? Math.min(selectedProduct.stock, 99) : 1
  );

  $effect(() => {
    if (filteredProducts.length > 0) {
      const currentId = selectedProductId !== null ? Number(selectedProductId) : null;
      if (currentId === null || !filteredProducts.some(p => p.id === currentId)) {
        selectedProductId = filteredProducts[0].id;
      }
    } else {
      selectedProductId = null;
    }
  });

  $effect(() => {
    if (selectedProduct) {
      const max = Math.min(selectedProduct.stock, 99);
      if (max > 0 && selectedQuantity > max) {
        selectedQuantity = max;
      } else if (selectedQuantity < 1) {
        selectedQuantity = 1;
      }
    }
  });

  function formatMemberName(m: Member | null): string {
    if (!m) return '';
    const maskedLast = m.lastName
      ? (m.lastName.length > 2 && !m.lastName.endsWith('.') ? `${m.lastName[0]}.` : m.lastName)
      : '';
    return `${maskedLast} ${m.firstName}`.trim();
  }

  function formatLicence(licence: string): string {
    if (!licence) return '***';
    if (licence.includes('*')) return licence;
    if (licence.length <= 4) return '***';
    return `${licence.slice(0, 2)}***${licence.slice(-2)}`;
  }

  $effect(() => {
    if (!isMemberDropdownOpen) {
      highlightedIndex = -1;
    }
  });

  $effect(() => {
    if (highlightedIndex >= filteredMembers.length) {
      highlightedIndex = filteredMembers.length - 1;
    }
  });

  // Debounced member search from API
  $effect(() => {
    if (!isMemberDropdownOpen) return;

    const query = memberSearchQuery.trim();
    if (lastSelectedMember && memberSearchQuery === formatMemberName(lastSelectedMember)) {
      return;
    }

    if (query.length > 0 && query.length < 3) {
      return;
    }

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/members-search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json() as Member[];
          fetchedMembers = data;
        }
      } catch (err) {
        console.error('Error fetching members from API:', err);
      }
    }, query === '' ? 0 : 300);

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  });

  function selectMember(m: Member) {
    selectedMemberId = m.id.toString();
    lastSelectedMember = m;
    memberSearchQuery = formatMemberName(m);
    isMemberDropdownOpen = false;
    highlightedIndex = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isMemberDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        isMemberDropdownOpen = true;
        highlightedIndex = 0;
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (filteredMembers.length > 0) {
        highlightedIndex = (highlightedIndex + 1) % filteredMembers.length;
        scrollOptionIntoView(highlightedIndex);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (filteredMembers.length > 0) {
        highlightedIndex = (highlightedIndex - 1 + filteredMembers.length) % filteredMembers.length;
        scrollOptionIntoView(highlightedIndex);
      }
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredMembers.length) {
        selectMember(filteredMembers[highlightedIndex]);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      isMemberDropdownOpen = false;
      e.preventDefault();
    }
  }

  function scrollOptionIntoView(index: number) {
    setTimeout(() => {
      const container = document.getElementById('member-listbox');
      const option = document.getElementById(`member-option-${index}`);
      if (container && option) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const optionTop = option.offsetTop;
        const optionBottom = optionTop + option.clientHeight;

        if (optionTop < containerTop) {
          container.scrollTop = optionTop;
        } else if (optionBottom > containerBottom) {
          container.scrollTop = optionBottom - container.clientHeight;
        }
      }
    }, 0);
  }

  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));

  let selectedMember = $derived(
    members.length > 0
      ? (members.find(m => m.id.toString() === selectedMemberId) || null)
      : lastSelectedMember
  );

  let memberDisplayVal = $derived(
    selectedMember ? formatMemberName(selectedMember) : ''
  );

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
    if (selectedQuantity < maxQuantity) {
      selectedQuantity += 1;
    }
  }

  function decrementQty() {
    if (selectedQuantity > 1) {
      selectedQuantity -= 1;
    }
  }

  async function handleOrder() {
    if (!selectedMemberId) {
      errorMessage = "Veuillez sélectionner un adhérent pour commander.";
      return;
    }

    if (!selectedProduct) {
      errorMessage = "Veuillez sélectionner un produit.";
      return;
    }

    if (selectedProduct.stock < selectedQuantity || selectedProduct.stock <= 0) {
      errorMessage = "Stock insuffisant pour ce produit.";
      return;
    }

    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const turnstileResponse = isTest
      ? 'mock-test-token'
      : (document.getElementsByName('cf-turnstile-response')[0] as HTMLInputElement)?.value;
    if (!turnstileResponse) {
      errorMessage = "Veuillez valider le test de sécurité anti-bot.";
      return;
    }

    errorMessage = null;
    successMessage = null;
    submitting = true;

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seasonId: activeSeasonId,
          memberId: parseInt(selectedMemberId),
          productId: selectedProduct.id,
          quantity: selectedQuantity,
          paymentMethod: selectedPaymentMethod,
          turnstileToken: turnstileResponse
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement de la commande.");
      }

      successMessage = `Votre souhait d'achat de ${selectedQuantity} ${selectedProduct.name} a bien été enregistré. Il sera comptabilisé dès validation par le trésorier.`;
      selectedQuantity = 1;

      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
      }
    } catch (err: any) {
      errorMessage = err.message || "Une erreur est survenue.";
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
      }
    } finally {
      submitting = false;
    }
  }
</script>

<Card.Root class="max-w-2xl mx-auto shadow-xl">
  <!-- Card Header Banner -->
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
    <!-- Section 1: Member Selection (Buyer) -->
    <div class="space-y-3 pb-4 border-b border-border">
      <Label for="member-input" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Acheteur (Adhérent)</Label>

      <div class="relative">
        <div class="relative">
          <Search class="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground z-10" />
          <Input
            id="member-input"
            type="text"
            role="combobox"
            autocomplete="off"
            aria-expanded={isMemberDropdownOpen}
            aria-autocomplete="list"
            aria-controls="member-listbox"
            aria-activedescendant={highlightedIndex >= 0 ? `member-option-${highlightedIndex}` : undefined}
            placeholder="Rechercher par Nom, Prénom, ou N° Licence (min 3 caractères)..."
            class="w-full pl-10 pr-10 h-10 rounded-xl font-semibold"
            value={isMemberDropdownOpen ? memberSearchQuery : memberDisplayVal}
            oninput={(e) => {
              isMemberDropdownOpen = true;
              memberSearchQuery = (e.target as HTMLInputElement).value;
            }}
            onfocus={(e) => {
              isMemberDropdownOpen = true;
              if (selectedMember) {
                memberSearchQuery = formatMemberName(selectedMember);
              } else {
                memberSearchQuery = '';
              }
              (e.target as HTMLInputElement).select();
            }}
            onblur={() => {
              setTimeout(() => { isMemberDropdownOpen = false; }, 200);
            }}
            onkeydown={handleKeyDown}
          />
          <ChevronDown class="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        </div>

        {#if isMemberDropdownOpen}
          <div
            role="listbox"
            id="member-listbox"
            class="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl divide-y divide-border"
          >
            {#each filteredMembers as m, index}
              <button
                type="button"
                role="option"
                aria-selected={selectedMemberId === m.id.toString()}
                id={`member-option-${index}`}
                class="w-full text-left px-4 py-2.5 text-sm transition-colors font-semibold border-0 cursor-pointer {index === highlightedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}"
                onmousedown={() => {
                  selectMember(m);
                }}
              >
                <div class="flex justify-between items-center">
                  <span>{formatMemberName(m)}</span>
                  <Badge variant="outline" class="font-mono">Licence: {formatLicence(m.licence)}</Badge>
                </div>
              </button>
            {:else}
              <div class="px-4 py-3 text-sm text-muted-foreground italic bg-popover">
                {memberSearchQuery.trim().length > 0 && memberSearchQuery.trim().length < 3 ? 'Saisissez au moins 3 caractères pour rechercher' : 'Aucun adhérent trouvé'}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Member Selection Badge -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        {#if selectedMember}
          <Badge variant="outline" class="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
            <Check class="w-4 h-4" />
            Adhérent sélectionné : <span class="font-bold">{formatMemberName(selectedMember)}</span>
          </Badge>
        {:else}
          <Badge variant="destructive" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
            <AlertCircle class="w-4 h-4" />
            Sélectionnez votre nom d'adhérent pour débloquer la commande.
          </Badge>
        {/if}
      </div>
    </div>

    <!-- Section 2: Mode de Paiement -->
    <div class="space-y-2 pb-4 border-b border-border">
      <Label for="payment-method-select" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Mode de paiement</Label>
      <div class="relative">
        <select
          id="payment-method-select"
          bind:value={selectedPaymentMethod}
          class="w-full px-3 h-10 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground pr-8 appearance-none font-semibold"
        >
          {#each paymentMethodsList as pm}
            <option value={pm.value}>{pm.label}</option>
          {/each}
        </select>
        <ChevronDown class="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
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
            <select
              id="category-select"
              bind:value={selectedCategory}
              class="w-full px-3 h-10 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground pr-8 appearance-none font-semibold"
            >
              {#each categoriesList as cat}
                <option value={cat.value}>{cat.label}</option>
              {/each}
            </select>
            <ChevronDown class="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <!-- Select 2: Produit -->
        <div class="space-y-1.5">
          <Label for="product-select" class="block text-xs font-semibold text-foreground">Produit</Label>
          <div class="relative">
            <select
              id="product-select"
              bind:value={selectedProductId}
              class="w-full px-3 h-10 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground pr-8 appearance-none font-semibold"
              disabled={filteredProducts.length === 0}
            >
              {#if filteredProducts.length === 0}
                <option value={null}>Aucun article disponible</option>
              {:else}
                {#each filteredProducts as product (product.id)}
                  <option value={product.id}>
                    {product.name} — {(product.price / 100).toFixed(2)} € ({product.stock > 0 ? `Stock: ${product.stock}` : 'Rupture'})
                  </option>
                {/each}
              {/if}
            </select>
            <ChevronDown class="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
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
              onclick={decrementQty}
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
              onclick={incrementQty}
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

    <!-- Section 4: Récapitulatif & Valider -->
    <div class="space-y-4">
      <div class="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
        <div class="flex justify-between items-center text-sm font-semibold text-muted-foreground">
          <span>Article sélectionné :</span>
          <span class="text-foreground">{selectedProduct ? selectedProduct.name : '—'}</span>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-border/50">
          <span class="text-base font-bold text-foreground">Montant total :</span>
          <span class="text-xl font-extrabold text-primary">
            {(totalPriceCents / 100).toFixed(2)} €
          </span>
        </div>
      </div>

      <!-- Turnstile Widget -->
      <div class="cf-turnstile" style={!selectedMember ? 'display: none;' : ''} data-sitekey="0x4AAAAAAD1TY7I_ql47XOjI" data-action="turnstile-spin-v1"></div>

      <!-- Submit Button -->
      <Button
        onclick={handleOrder}
        disabled={!selectedMemberId || !selectedProduct || selectedProduct.stock <= 0 || selectedQuantity > selectedProduct.stock || submitting}
        class="w-full flex justify-center items-center gap-2 font-bold h-11 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
      >
        {#if submitting}
          <span class="animate-pulse">Envoi de la commande...</span>
        {:else}
          <ShoppingBag class="w-4 h-4" />
          Valider la commande
        {/if}
      </Button>

      <!-- Feedback Messages -->
      {#if successMessage}
        <div class="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-start gap-2">
          <Check class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      {/if}

      {#if errorMessage}
        <div class="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-start gap-2">
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
