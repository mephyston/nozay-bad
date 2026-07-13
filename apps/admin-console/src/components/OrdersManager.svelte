<script lang="ts">
  import { Check, X, Clock, ShoppingBag, Search, AlertCircle, Calendar, History, User } from "lucide-svelte";

  interface Order {
    id: number;
    seasonId: string;
    memberId: number;
    productId: number;
    quantity: number;
    totalAmount: number;
    paymentMethod: 'virement' | 'cheque' | 'especes' | 'labaz' | 'ancv' | 'pass_sport' | 'ticket_loisir' | 'up_loisir';
    status: 'pending' | 'approved' | 'rejected';
    transactionId: number | null;
    createdAt: string | Date;
  }

  interface Member {
    id: number;
    firstName: string;
    lastName: string;
    licence: string;
  }

  interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    active: boolean;
    category: string;
  }

  interface OrderItem {
    order: Order;
    member?: Member;
    product?: Product;
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
  }

  let {
    seasons = [],
    orders = []
  }: {
    seasons: Season[];
    orders: OrderItem[];
  } = $props();

  const paymentMethodLabels: Record<string, string> = {
    virement: 'Virement',
    cheque: 'Chèque',
    especes: 'Espèces',
    labaz: 'Labaz',
    ancv: 'Chèque ANCV',
    pass_sport: 'Pass\'Sport',
    ticket_loisir: 'Ticket Loisir',
    up_loisir: 'Up Loisir'
  };

  // Local state
  // svelte-ignore state_referenced_locally
  let ordersList = $state<OrderItem[]>(orders);
  let activeTab = $state<'pending' | 'history'>('pending');
  let searchTerm = $state('');
  let processingId = $state<number | null>(null);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  // Sync state if orders prop changes
  $effect(() => {
    ordersList = orders;
  });

  // Filtered orders based on search term
  let filteredOrders = $derived(
    ordersList.filter(item => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;

      const memberName = `${item.member?.lastName || ''} ${item.member?.firstName || ''}`.toLowerCase();
      const licence = (item.member?.licence || '').toLowerCase();
      const productName = (item.product?.name || '').toLowerCase();
      const paymentMethod = (paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod).toLowerCase();
      const amount = (item.order.totalAmount / 100).toFixed(2);

      return (
        memberName.includes(term) ||
        licence.includes(term) ||
        productName.includes(term) ||
        paymentMethod.includes(term) ||
        amount.includes(term)
      );
    })
  );

  // Pending orders
  let pendingOrders = $derived(
    filteredOrders.filter(item => item.order.status === 'pending')
  );

  // History orders (approved & rejected)
  let historyOrders = $derived(
    filteredOrders.filter(item => item.order.status === 'approved' || item.order.status === 'rejected')
  );

  // Grouping pending orders by season
  let pendingBySeason = $derived(
    seasons.map(season => {
      const seasonPending = pendingOrders.filter(o => o.order.seasonId === season.id);
      return {
        season,
        orders: seasonPending
      };
    }).filter(group => group.orders.length > 0)
  );

  // Grouping history orders by season
  let historyBySeason = $derived(
    seasons.map(season => {
      const seasonHistory = historyOrders.filter(o => o.order.seasonId === season.id);
      return {
        season,
        orders: seasonHistory
      };
    }).filter(group => group.orders.length > 0)
  );

  async function getErrorMessage(res: Response, defaultMsg: string): Promise<string> {
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return json.error || json.message || defaultMsg;
      } catch {
        return text || defaultMsg;
      }
    } catch {
      return defaultMsg;
    }
  }

  async function handleApprove(orderId: number) {
    if (processingId !== null) return;
    errorMsg = null;
    successMsg = null;
    processingId = orderId;

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: orderId })
      });

      if (!res.ok) {
        const errText = await getErrorMessage(res, 'Erreur lors de la validation');
        throw new Error(errText);
      }

      successMsg = 'Commande validée avec succès !';

      // Update local state for immediate feedback
      const index = ordersList.findIndex(o => o.order.id === orderId);
      if (index !== -1) {
        ordersList[index].order.status = 'approved';
        if (ordersList[index].product) {
          // Decrement stock in local view
          ordersList[index].product!.stock = Math.max(0, ordersList[index].product!.stock - ordersList[index].order.quantity);
        }
      }

      // Reload to ensure DB consistency
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue';
    } finally {
      processingId = null;
    }
  }

  async function handleReject(orderId: number) {
    if (processingId !== null) return;
    if (!confirm('Êtes-vous sûr de vouloir refuser cette commande ?')) return;

    errorMsg = null;
    successMsg = null;
    processingId = orderId;

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', id: orderId })
      });

      if (!res.ok) {
        const errText = await getErrorMessage(res, 'Erreur lors du rejet');
        throw new Error(errText);
      }

      successMsg = 'Commande refusée avec succès.';

      // Update local state for immediate feedback
      const index = ordersList.findIndex(o => o.order.id === orderId);
      if (index !== -1) {
        ordersList[index].order.status = 'rejected';
      }

      // Reload to ensure DB consistency
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue';
    } finally {
      processingId = null;
    }
  }
</script>

<div class="space-y-6">
  <!-- Top Panel -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
    <div>
      <h1 class="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
        <ShoppingBag class="h-6 w-6 text-primary" />
        Validation des Commandes
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Validez ou refusez les demandes d'achats boutique des adhérents et consultez l'historique.
      </p>
    </div>
  </div>

  {#if errorMsg}
    <div class="p-4 bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg flex items-center gap-2">
      <AlertCircle class="w-5 h-5 shrink-0" />
      <span>{errorMsg}</span>
    </div>
  {/if}

  {#if successMsg}
    <div class="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg flex items-center gap-2">
      <Check class="w-5 h-5 shrink-0" />
      <span>{successMsg}</span>
    </div>
  {/if}

  <!-- Main Tabs & Search Navigation -->
  <div class="border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex gap-4">
      <button
        onclick={() => { activeTab = 'pending'; errorMsg = null; successMsg = null; }}
        class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px flex items-center gap-1.5 {activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        <Clock class="h-4 w-4" />
        Demandes en attente ({pendingOrders.length})
      </button>
      <button
        onclick={() => { activeTab = 'history'; errorMsg = null; successMsg = null; }}
        class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px flex items-center gap-1.5 {activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        <History class="h-4 w-4" />
        Historique ({historyOrders.length})
      </button>
    </div>

    <div class="relative w-full sm:w-64 pb-2 sm:pb-0">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Rechercher une commande..."
        bind:value={searchTerm}
        class="pl-9 pr-3 py-1.5 w-full border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
      />
    </div>
  </div>

  <!-- Tab Contents -->
  {#if activeTab === 'pending'}
    <div class="space-y-8">
      {#if pendingBySeason.length === 0}
        <div class="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          <Clock class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          Aucune commande en attente.
        </div>
      {:else}
        {#each pendingBySeason as group}
          <div class="space-y-3">
            <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar class="w-4 h-4 text-muted-foreground" />
              {group.season.name}
            </h2>

            <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr class="bg-muted/40 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th class="py-3 px-4">Date</th>
                      <th class="py-3 px-4">Adhérent</th>
                      <th class="py-3 px-4">Article</th>
                      <th class="py-3 px-4 text-center">Quantité</th>
                      <th class="py-3 px-4">Paiement</th>
                      <th class="py-3 px-4 text-right">Total</th>
                      <th class="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {#each group.orders as item (item.order.id)}
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(item.order.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td class="py-3 px-4">
                          {#if item.member}
                            <div class="font-medium text-foreground">
                              {item.member.lastName} {item.member.firstName}
                            </div>
                            <div class="text-xs text-muted-foreground font-mono">
                              Licence: {item.member.licence}
                            </div>
                          {:else}
                            <span class="text-xs text-muted-foreground italic">Inconnu</span>
                          {/if}
                        </td>
                        <td class="py-3 px-4">
                          {#if item.product}
                            <div class="font-medium text-foreground">{item.product.name}</div>
                            <div class="flex items-center gap-2 mt-1">
                              {#if item.product.stock >= item.order.quantity}
                                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  {item.product.stock} en stock
                                </span>
                              {:else}
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">
                                  <AlertCircle class="w-3 h-3" />
                                  Stock insuffisant ({item.product.stock})
                                </span>
                              {/if}
                            </div>
                          {:else}
                            <span class="text-xs text-muted-foreground italic">Produit supprimé</span>
                          {/if}
                        </td>
                        <td class="py-3 px-4 text-center font-semibold text-foreground">
                          {item.order.quantity}
                        </td>
                        <td class="py-3 px-4 whitespace-nowrap">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                            {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right font-bold text-foreground">
                          {(item.order.totalAmount / 100).toFixed(2)} €
                        </td>
                        <td class="py-3 px-4 text-center">
                          <div class="flex items-center justify-center gap-2">
                            <button
                              onclick={() => handleApprove(item.order.id)}
                              disabled={processingId !== null || (item.product && item.product.stock < item.order.quantity)}
                              class="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
                              title={item.product && item.product.stock < item.order.quantity ? "Stock insuffisant" : "Valider la commande"}
                            >
                              {#if processingId === item.order.id}
                                <span class="animate-pulse">En cours...</span>
                              {:else}
                                <Check class="h-3.5 w-3.5" />
                                Valider
                              {/if}
                            </button>
                            <button
                              onclick={() => handleReject(item.order.id)}
                              disabled={processingId !== null}
                              class="inline-flex items-center gap-1 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 text-destructive text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-destructive/30 cursor-pointer"
                            >
                              <X class="h-3.5 w-3.5" />
                              Refuser
                            </button>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <div class="space-y-8">
      {#if historyBySeason.length === 0}
        <div class="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          <History class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          Aucun historique de commande disponible.
        </div>
      {:else}
        {#each historyBySeason as group}
          <div class="space-y-3">
            <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar class="w-4 h-4 text-muted-foreground" />
              {group.season.name}
            </h2>

            <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr class="bg-muted/40 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th class="py-3 px-4">Date</th>
                      <th class="py-3 px-4">Adhérent</th>
                      <th class="py-3 px-4">Article</th>
                      <th class="py-3 px-4 text-center">Quantité</th>
                      <th class="py-3 px-4">Paiement</th>
                      <th class="py-3 px-4 text-right">Total</th>
                      <th class="py-3 px-4 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {#each group.orders as item (item.order.id)}
                      <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(item.order.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td class="py-3 px-4">
                          {#if item.member}
                            <div class="font-medium text-foreground">
                              {item.member.lastName} {item.member.firstName}
                            </div>
                            <div class="text-xs text-muted-foreground font-mono">
                              Licence: {item.member.licence}
                            </div>
                          {:else}
                            <span class="text-xs text-muted-foreground italic">Inconnu</span>
                          {/if}
                        </td>
                        <td class="py-3 px-4">
                          {#if item.product}
                            <span class="font-medium text-foreground">{item.product.name}</span>
                          {:else}
                            <span class="text-xs text-muted-foreground italic">Produit supprimé</span>
                          {/if}
                        </td>
                        <td class="py-3 px-4 text-center font-semibold text-foreground">
                          {item.order.quantity}
                        </td>
                        <td class="py-3 px-4 whitespace-nowrap">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                            {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right font-bold text-foreground">
                          {(item.order.totalAmount / 100).toFixed(2)} €
                        </td>
                        <td class="py-3 px-4 text-center">
                          {#if item.order.status === 'approved'}
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Check class="w-3 h-3" />
                              Validée
                            </span>
                            {#if item.order.transactionId}
                              <div class="text-[10px] text-muted-foreground mt-0.5">
                                Tx: #{item.order.transactionId}
                              </div>
                            {/if}
                          {:else if item.order.status === 'rejected'}
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">
                              <X class="w-3 h-3" />
                              Refusée
                            </span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
