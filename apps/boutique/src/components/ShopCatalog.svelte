<script lang="ts">
  import { ShoppingBag, Search, Check, AlertCircle, ChevronDown, User } from "lucide-svelte";
  import { Button, Card, Input, Label, Badge } from '@metacult/shared-ui';

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

  // Local state for products list to enable reactive updates
  // svelte-ignore state_referenced_locally
  let productsList = $state<Product[]>(products.map(p => ({ ...p })));

  // Sync state if products prop changes
  $effect(() => {
    productsList = products.map(p => ({ ...p }));
  });

  // Local state for member selection combobox
  let selectedMemberId = $state<string>('');
  let memberSearchQuery = $state<string>('');
  let isMemberDropdownOpen = $state<boolean>(false);
  let highlightedIndex = $state<number>(-1);

  // Reset highlightedIndex when dropdown closes
  $effect(() => {
    if (!isMemberDropdownOpen) {
      highlightedIndex = -1;
    }
  });

  // Clamp highlightedIndex when filteredMembers changes
  $effect(() => {
    if (highlightedIndex >= filteredMembers.length) {
      highlightedIndex = filteredMembers.length - 1;
    }
  });

  function selectMember(m: Member) {
    selectedMemberId = m.id.toString();
    memberSearchQuery = `${m.lastName} ${m.firstName}`;
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
      highlightedIndex = (highlightedIndex + 1) % filteredMembers.length;
      e.preventDefault();
      scrollOptionIntoView(highlightedIndex);
    } else if (e.key === 'ArrowUp') {
      highlightedIndex = (highlightedIndex - 1 + filteredMembers.length) % filteredMembers.length;
      e.preventDefault();
      scrollOptionIntoView(highlightedIndex);
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

  // Local state for product ordering inputs
  let quantities = $state<Record<number, number>>({});
  let paymentMethods = $state<Record<number, string>>({});
  let submitting = $state<Record<number, boolean>>({});
  let successMessages = $state<Record<number, string | null>>({});
  let errorMessages = $state<Record<number, string | null>>({});

  // Ensure default quantity and payment method for each product
  $effect(() => {
    productsList.forEach(p => {
      if (quantities[p.id] === undefined) quantities[p.id] = 1;
      if (paymentMethods[p.id] === undefined) paymentMethods[p.id] = 'virement';
    });
  });

  // Derived member lists for dropdown
  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  
  let selectedMember = $derived(
    members.find(m => m.id.toString() === selectedMemberId) || null
  );

  let memberDisplayVal = $derived(
    selectedMember ? `${selectedMember.lastName} ${selectedMember.firstName}` : ''
  );

  let filteredMembers = $derived(
    memberSearchQuery.trim() === ''
      ? sortedMembers
      : sortedMembers.filter(m =>
          `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
        )
  );

  async function handleOrder(productId: number) {
    const qty = quantities[productId] || 1;
    const pm = paymentMethods[productId] || 'virement';
    const product = productsList.find(p => p.id === productId);

    if (!selectedMemberId) {
      errorMessages[productId] = "Veuillez sélectionner un adhérent pour commander.";
      return;
    }

    if (!product) {
      errorMessages[productId] = "Produit inexistant.";
      return;
    }
    // Retrieve Turnstile response token (bypassed in test environment)
    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const turnstileResponse = isTest
      ? 'mock-test-token'
      : (document.getElementsByName('cf-turnstile-response')[0] as HTMLInputElement)?.value;
    if (!turnstileResponse) {
      errorMessages[productId] = "Veuillez valider le test de sécurité anti-bot.";
      return;
    }

    errorMessages[productId] = null;
    successMessages[productId] = null;
    submitting[productId] = true;

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seasonId: activeSeasonId,
          memberId: parseInt(selectedMemberId),
          productId: productId,
          quantity: qty,
          paymentMethod: pm,
          turnstileToken: turnstileResponse
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement de la commande.");
      }

      // Success message
      successMessages[productId] = `Votre souhait d'achat de ${qty} ${product.name} a bien été enregistré. Il sera comptabilisé dès validation par le trésorier.`;
      
      // Update local qty
      quantities[productId] = 1;

      // Reset Turnstile on success to allow another order
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
      }
    } catch (err: any) {
      errorMessages[productId] = err.message || "Une erreur est survenue.";
      // Reset Turnstile on failure so they can retry
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
      }
    } finally {
      submitting[productId] = false;
    }
  }

  function incrementQty(productId: number, max: number) {
    const current = quantities[productId] || 1;
    if (current < max) {
      quantities[productId] = current + 1;
    }
  }

  function decrementQty(productId: number) {
    const current = quantities[productId] || 1;
    if (current > 1) {
      quantities[productId] = current - 1;
    }
  }
</script>

<div class="space-y-8 max-w-6xl mx-auto px-4 py-8">
  <!-- Member Selection Section -->
  <div class="bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-md space-y-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-primary/10 text-primary rounded-lg">
        <User class="w-6 h-6" />
      </div>
      <div>
        <Label for="member-input" class="text-xl font-bold tracking-tight block cursor-pointer">Qui effectue l'achat ?</Label>
        <p class="text-xs text-muted-foreground font-medium mt-1">Sélectionnez votre nom dans la liste des adhérents du club.</p>
      </div>
    </div>

    <!-- Dropdown / Autocomplete Combobox -->
    <div class="relative max-w-md">
      <div class="relative">
        <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
        <Input
          id="member-input"
          type="text"
          role="combobox"
          autocomplete="off"
          aria-expanded={isMemberDropdownOpen}
          aria-autocomplete="list"
          aria-controls="member-listbox"
          aria-activedescendant={highlightedIndex >= 0 ? `member-option-${highlightedIndex}` : undefined}
          placeholder="Rechercher par Nom, Prénom, ou N° Licence..."
          class="w-full pl-10 pr-10 h-10 bg-background text-sm text-foreground font-medium"
          value={isMemberDropdownOpen ? memberSearchQuery : memberDisplayVal}
          oninput={(e) => {
            isMemberDropdownOpen = true;
            memberSearchQuery = (e.target as HTMLInputElement).value;
          }}
          onfocus={(e) => {
            isMemberDropdownOpen = true;
            if (selectedMember) {
              memberSearchQuery = `${selectedMember.lastName} ${selectedMember.firstName}`;
            } else {
              memberSearchQuery = '';
            }
            (e.target as HTMLInputElement).select();
          }}
          onblur={() => {
            // Delay to allow onmousedown selection of buttons
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
          class="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl divide-y divide-border"
        >
          {#each filteredMembers as m, index}
            <button
              type="button"
              role="option"
              aria-selected={selectedMemberId === m.id.toString()}
              id={`member-option-${index}`}
              class="w-full text-left px-4 py-2.5 text-sm transition-colors font-medium border-0 cursor-pointer {index === highlightedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}"
              onmousedown={() => {
                selectMember(m);
              }}
            >
              <div class="flex justify-between items-center">
                <span>{m.lastName} {m.firstName}</span>
                <Badge variant="outline" class="font-mono">Licence: {m.licence}</Badge>
              </div>
            </button>
          {:else}
            <div class="px-4 py-3 text-sm text-muted-foreground italic">Aucun adhérent trouvé</div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Active Member Badge & Security Check -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      {#if selectedMember}
        <Badge variant="outline" class="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <Check class="w-4 h-4" />
          Adhérent sélectionné : <span class="underline">{selectedMember.lastName} {selectedMember.firstName}</span>
        </Badge>
      {:else}
        <Badge variant="destructive" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <AlertCircle class="w-4 h-4" />
          Veuillez sélectionner un adhérent pour débloquer les commandes.
        </Badge>
      {/if}
      <div class="cf-turnstile" style={!selectedMember ? 'display: none;' : ''} data-sitekey="0x4AAAAAAD1TY7I_ql47XOjI" data-action="turnstile-spin-v1"></div>
    </div>
  </div>

  <!-- Catalog Section -->
  <div>
    <h2 class="text-2xl font-bold tracking-tight flex items-center gap-2 mb-6">
      <ShoppingBag class="w-6 h-6 text-primary" />
      Articles Disponibles
    </h2>

    {#if productsList.length === 0}
      <div class="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
        <ShoppingBag class="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
        <p class="text-lg font-medium">La boutique est vide pour le moment.</p>
        <p class="text-sm">Aucun produit actif n'est disponible.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each productsList as product (product.id)}
          <Card.Root class="overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            
            <!-- Card Header -->
            <Card.Header class="p-6 pb-4 space-y-2">
              <div class="flex justify-between items-start gap-2">
                <Card.Title class="text-lg font-bold tracking-tight text-foreground">{product.name}</Card.Title>
                <Badge variant={product.stock > 0 ? "outline" : "destructive"}>
                  {product.stock > 0 ? `Stock: ${product.stock}` : "Rupture"}
                </Badge>
              </div>
            </Card.Header>

            <!-- Card Content -->
            <Card.Content class="p-6 pt-0 flex-grow flex flex-col justify-between space-y-2">
              <div class="flex justify-between items-center mt-2">
                <Badge variant="outline" class="uppercase tracking-wider
                  {product.category === 'shuttlecock' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : product.category === 'string' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}">
                  {product.category === 'shuttlecock' ? 'Volants' : product.category === 'string' ? 'Cordages' : 'Autre'}
                </Badge>
                
                <span class="text-lg font-bold text-primary">
                  {(product.price / 100).toFixed(2)} €
                </span>
              </div>
            </Card.Content>

            <!-- Card Footer / Order Panel -->
            <Card.Footer class="p-6 pt-0 border-t border-border/50 bg-muted/20 flex flex-col items-stretch w-full gap-4">
              {#if product.stock > 0}
                <div class="space-y-3 mt-4 w-full">
                  <!-- Quantity Selector -->
                  <div class="flex justify-between items-center">
                    <Label for="qty-{product.id}" class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantité</Label>
                    <div class="flex items-center border border-border bg-background rounded-lg overflow-hidden">
                      <Button
                        variant="ghost"
                        onclick={() => decrementQty(product.id)}
                        disabled={quantities[product.id] <= 1}
                        class="px-2.5 py-1 h-8 text-sm hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0"
                      >
                        -
                      </Button>
                      <Input
                        id="qty-{product.id}"
                        type="number"
                        min="1"
                        max={99}
                        bind:value={quantities[product.id]}
                        class="w-12 h-8 text-center text-sm font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                      />
                      <Button
                        variant="ghost"
                        onclick={() => incrementQty(product.id, 99)}
                        disabled={quantities[product.id] >= 99}
                        class="px-2.5 py-1 h-8 text-sm hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <!-- Payment Method -->
                  <div class="space-y-1">
                    <Label for="pm-{product.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Mode de paiement prévu</Label>
                    <div class="relative">
                      <select
                        id="pm-{product.id}"
                        bind:value={paymentMethods[product.id]}
                        class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground pr-8 appearance-none"
                      >
                        {#each paymentMethodsList as pm}
                          <option value={pm.value}>{pm.label}</option>
                        {/each}
                      </select>
                      <ChevronDown class="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <!-- Submit button -->
                  <Button
                    onclick={() => handleOrder(product.id)}
                    disabled={!selectedMemberId || submitting[product.id]}
                    class="w-full flex justify-center items-center gap-2 font-semibold h-10 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {#if submitting[product.id]}
                      <span class="animate-pulse">Envoi en cours...</span>
                    {:else}
                      <ShoppingBag class="w-4 h-4" />
                      Commander
                    {/if}
                  </Button>
                </div>
              {:else}
                <div class="text-center py-6 text-sm text-muted-foreground italic mt-4 w-full">
                  Cet article n'est plus en stock.
                </div>
              {/if}

              <!-- Individual Feedbacks -->
              {#if successMessages[product.id]}
                <div class="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-start gap-1.5 w-full">
                  <Check class="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessages[product.id]}</span>
                </div>
              {/if}

              {#if errorMessages[product.id]}
                <div class="mt-3 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-start gap-1.5 w-full">
                  <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessages[product.id]}</span>
                </div>
              {/if}
            </Card.Footer>
          </Card.Root>
        {/each}
      </div>
    {/if}
  </div>
</div>
