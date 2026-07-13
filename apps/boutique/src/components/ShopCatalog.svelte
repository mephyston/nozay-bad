<script lang="ts">
  import { ShoppingBag, Search, Check, AlertCircle, ChevronDown, User } from "lucide-svelte";

  interface Member {
    id: number;
    firstName: string;
    lastName: string;
    licence: string;
  }

  interface Product {
    id: number;
    name: string;
    category: 'shuttlecock' | 'string';
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

    if (qty > product.stock) {
      errorMessages[productId] = `Stock insuffisant. Maximum disponible : ${product.stock}`;
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
          paymentMethod: pm
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement de la commande.");
      }

      // Success message
      successMessages[productId] = `Votre souhait d'achat de ${qty} ${product.name} a bien été enregistré. Il sera comptabilisé dès validation par le trésorier.`;
      
      // Update local stock and reset qty
      product.stock = Math.max(0, product.stock - qty);
      quantities[productId] = 1;
    } catch (err: any) {
      errorMessages[productId] = err.message || "Une erreur est survenue.";
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
        <h2 class="text-xl font-bold tracking-tight">Qui effectue l'achat ?</h2>
        <p class="text-xs text-muted-foreground font-medium">Sélectionnez votre nom dans la liste des adhérents du club.</p>
      </div>
    </div>

    <!-- Dropdown / Autocomplete Combobox -->
    <div class="relative max-w-md">
      <div class="relative">
        <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          id="member-input"
          type="text"
          placeholder="Rechercher par Nom, Prénom, ou N° Licence..."
          class="w-full pl-10 pr-10 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground font-medium"
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
            // Delay to allow onmousedown selection of buttons
            setTimeout(() => { isMemberDropdownOpen = false; }, 200);
          }}
        />
        <ChevronDown class="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {#if isMemberDropdownOpen}
        <div class="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl divide-y divide-border">
          {#each filteredMembers as m}
            <button
              type="button"
              class="w-full text-left px-4 py-2.5 text-sm hover:bg-muted text-foreground transition-colors font-medium border-0 cursor-pointer"
              onmousedown={() => {
                selectedMemberId = m.id.toString();
                memberSearchQuery = `${m.lastName} ${m.firstName}`;
                isMemberDropdownOpen = false;
              }}
            >
              <div class="flex justify-between items-center">
                <span>{m.lastName} {m.firstName}</span>
                <span class="text-xs text-muted-foreground font-mono">Licence: {m.licence}</span>
              </div>
            </button>
          {:else}
            <div class="px-4 py-3 text-sm text-muted-foreground italic">Aucun adhérent trouvé</div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Active Member Badge -->
    {#if selectedMember}
      <div class="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
        <Check class="w-4 h-4" />
        Adhérent sélectionné : <span class="underline">{selectedMember.lastName} {selectedMember.firstName}</span>
      </div>
    {:else}
      <div class="inline-flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
        <AlertCircle class="w-4 h-4" />
        Veuillez sélectionner un adhérent pour débloquer les commandes.
      </div>
    {/if}
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
          <div class="bg-card text-card-foreground border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            
            <!-- Card Header -->
            <div class="p-6 pb-4 space-y-2">
              <div class="flex justify-between items-start gap-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wider
                  {product.category === 'shuttlecock' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}">
                  {product.category === 'shuttlecock' ? 'Volants' : 'Cordages'}
                </span>
                
                <span class="text-lg font-bold text-primary">
                  {(product.price / 100).toFixed(2)} €
                </span>
              </div>
              
              <h3 class="text-lg font-bold tracking-tight text-foreground">{product.name}</h3>
              
              <div class="flex items-center gap-1.5 text-xs">
                {#if product.stock > 0}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {product.stock} disponibles
                  </span>
                {:else}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                    Rupture de stock
                  </span>
                {/if}
              </div>
            </div>

            <!-- Card Action Area / Order Panel -->
            <div class="p-6 pt-0 border-t border-border/50 bg-muted/20 space-y-4">
              
              {#if product.stock > 0}
                <div class="space-y-3 mt-4">
                  <!-- Quantity Selector -->
                  <div class="flex justify-between items-center">
                    <label for="qty-{product.id}" class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantité</label>
                    <div class="flex items-center border border-border bg-background rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onclick={() => decrementQty(product.id)}
                        disabled={quantities[product.id] <= 1}
                        class="px-2.5 py-1 text-sm hover:bg-muted disabled:opacity-30 cursor-pointer font-bold border-0"
                      >
                        -
                      </button>
                      <input
                        id="qty-{product.id}"
                        type="number"
                        min="1"
                        max={product.stock}
                        bind:value={quantities[product.id]}
                        class="w-12 text-center text-sm font-semibold border-0 focus:outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onclick={() => incrementQty(product.id, product.stock)}
                        disabled={quantities[product.id] >= product.stock}
                        class="px-2.5 py-1 text-sm hover:bg-muted disabled:opacity-30 cursor-pointer font-bold border-0"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <!-- Payment Method -->
                  <div class="space-y-1">
                    <label for="pm-{product.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Mode de paiement prévu</label>
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
                  <button
                    type="button"
                    onclick={() => handleOrder(product.id)}
                    disabled={!selectedMemberId || submitting[product.id]}
                    class="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 mt-2"
                  >
                    {#if submitting[product.id]}
                      <span class="animate-pulse">Envoi en cours...</span>
                    {:else}
                      <ShoppingBag class="w-4 h-4" />
                      Commander
                    {/if}
                  </button>
                </div>
              {:else}
                <div class="text-center py-6 text-sm text-muted-foreground italic mt-4">
                  Cet article n'est plus en stock.
                </div>
              {/if}

              <!-- Individual Feedbacks -->
              {#if successMessages[product.id]}
                <div class="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-start gap-1.5">
                  <Check class="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessages[product.id]}</span>
                </div>
              {/if}

              {#if errorMessages[product.id]}
                <div class="mt-3 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-start gap-1.5">
                  <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessages[product.id]}</span>
                </div>
              {/if}

            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
