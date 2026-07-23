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

  let productsList = $derived(products);

  let selectedMemberId = $state<string>('');
  let memberSearchQuery = $state<string>('');
  let isMemberDropdownOpen = $state<boolean>(false);
  let highlightedIndex = $state<number>(-1);
  let lastSelectedMember = $state<Member | null>(null);
  let fetchedMembers = $state<Member[]>([]);
  let debounceTimeout: any;

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

  // Debounced member search with 3-character minimum requirement
  $effect(() => {
    if (!isMemberDropdownOpen) return;
    if (members.length > 0) return;

    const query = memberSearchQuery.trim();
    if (lastSelectedMember && memberSearchQuery === formatMemberName(lastSelectedMember)) {
      return;
    }

    // Require at least 3 characters when typing a search query
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

  let quantities = $state<Record<number, number>>({});
  let paymentMethods = $state<Record<number, string>>({});
  let submitting = $state<Record<number, boolean>>({});
  let successMessages = $state<Record<number, string | null>>({});
  let errorMessages = $state<Record<number, string | null>>({});

  $effect(() => {
    productsList.forEach(p => {
      if (quantities[p.id] === undefined) quantities[p.id] = 1;
      if (paymentMethods[p.id] === undefined) paymentMethods[p.id] = 'virement';
    });
  });

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
    members.length > 0
      ? (memberSearchQuery.trim() === ''
          ? sortedMembers
          : sortedMembers.filter(m =>
              `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
            )
        )
      : fetchedMembers
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

      successMessages[productId] = `Votre souhait d'achat de ${qty} ${product.name} a bien été enregistré. Il sera comptabilisé dès validation par le trésorier.`;
      quantities[productId] = 1;

      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
      }
    } catch (err: unknown) {
      errorMessages[productId] = err.message || "Une erreur est survenue.";
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

<Card.Root class="max-w-2xl mx-auto shadow-xl">
  <!-- Matching Card Header Banner -->
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
    <!-- Member Selection Section -->
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

      <!-- Member Selection Badge & Turnstile Widget -->
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
        <div class="cf-turnstile" style={!selectedMember ? 'display: none;' : ''} data-sitekey="0x4AAAAAAD1TY7I_ql47XOjI" data-action="turnstile-spin-v1"></div>
      </div>
    </div>

    <!-- Catalog Section -->
    <div class="space-y-4">
      <Label class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Articles disponibles</Label>

      {#if productsList.length === 0}
        <div class="border border-border rounded-xl p-8 text-center text-muted-foreground bg-muted/20">
          <ShoppingBag class="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
          <p class="text-sm font-semibold">Aucun article disponible pour le moment.</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each productsList as product (product.id)}
            <div class="border border-border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors shadow-sm space-y-3">
              <div class="flex justify-between items-start gap-3">
                <div>
                  <h3 class="font-bold text-base text-foreground tracking-tight">{product.name}</h3>
                  <div class="flex items-center gap-2 mt-1">
                    <Badge variant="outline" class="uppercase tracking-wider text-[10px]
                      {product.category === 'shuttlecock' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' : product.category === 'string' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}">
                      {product.category === 'shuttlecock' ? 'Volants' : product.category === 'string' ? 'Cordages' : 'Autre'}
                    </Badge>
                    <Badge variant={product.stock > 0 ? "outline" : "destructive"} class="text-[10px]">
                      {product.stock > 0 ? `Stock: ${product.stock}` : "Rupture"}
                    </Badge>
                  </div>
                </div>

                <div class="text-right">
                  <span class="text-lg font-extrabold text-primary block">
                    {(product.price / 100).toFixed(2)} €
                  </span>
                </div>
              </div>

              {#if product.stock > 0}
                <div class="pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <!-- Payment Method -->
                  <div class="space-y-1">
                    <Label for="pm-{product.id}" class="block text-[11px] font-bold text-muted-foreground uppercase">Mode de paiement</Label>
                    <div class="relative">
                      <select
                        id="pm-{product.id}"
                        bind:value={paymentMethods[product.id]}
                        class="w-full px-3 h-9 border border-border bg-background rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground pr-8 appearance-none font-medium"
                      >
                        {#each paymentMethodsList as pm}
                          <option value={pm.value}>{pm.label}</option>
                        {/each}
                      </select>
                      <ChevronDown class="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <!-- Quantity & Submit -->
                  <div class="flex items-center gap-2">
                    <div class="flex items-center border border-border bg-background rounded-lg overflow-hidden shrink-0">
                      <Button
                        variant="ghost"
                        onclick={() => decrementQty(product.id)}
                        disabled={quantities[product.id] <= 1}
                        class="px-2 py-1 h-9 text-xs hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0"
                      >
                        -
                      </Button>
                      <Input
                        id="qty-{product.id}"
                        type="number"
                        min="1"
                        max={99}
                        bind:value={quantities[product.id]}
                        class="w-10 h-9 text-center text-xs font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0"
                      />
                      <Button
                        variant="ghost"
                        onclick={() => incrementQty(product.id, 99)}
                        disabled={quantities[product.id] >= 99}
                        class="px-2 py-1 h-9 text-xs hover:bg-muted disabled:opacity-30 font-bold rounded-none border-0"
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      onclick={() => handleOrder(product.id)}
                      disabled={!selectedMemberId || submitting[product.id]}
                      class="flex-1 flex justify-center items-center gap-1.5 font-bold h-9 text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                    >
                      {#if submitting[product.id]}
                        <span class="animate-pulse">Envoi...</span>
                      {:else}
                        <ShoppingBag class="w-3.5 h-3.5" />
                        Commander
                      {/if}
                    </Button>
                  </div>
                </div>
              {:else}
                <div class="text-center py-2 text-xs text-muted-foreground italic border-t border-border/50">
                  Cet article n'est plus disponible.
                </div>
              {/if}

              {#if successMessages[product.id]}
                <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-start gap-1.5">
                  <Check class="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessages[product.id]}</span>
                </div>
              {/if}

              {#if errorMessages[product.id]}
                <div class="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-start gap-1.5">
                  <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessages[product.id]}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
