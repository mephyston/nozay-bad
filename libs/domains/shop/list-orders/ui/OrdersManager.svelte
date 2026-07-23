<script lang="ts">
  import { Check, X, Clock, ShoppingBag, Search, AlertCircle, Calendar, History, User, MoreVertical } from "@lucide/svelte";
  import { Button, Input, Badge, Card, Table } from "@metacult/shared-ui";


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
    closed?: boolean;
  }

  let {
    seasons = [],
    orders = [],
    seasonId
  }: {
    seasons: Season[];
    orders: OrderItem[];
    seasonId: string;
  } = $props();

  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);

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
    if (processingId !== null || isClosed) return;
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
    } catch (err: unknown) {
      errorMsg = err.message || 'Une erreur est survenue';
    } finally {
      processingId = null;
    }
  }

  async function handleReject(orderId: number) {
    if (processingId !== null || isClosed) return;
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
    } catch (err: unknown) {
      errorMsg = err.message || 'Une erreur est survenue';
    } finally {
      processingId = null;
    }
  }

  let openDropdownId = $state<number | null>(null);

  function toggleDropdown(id: number, e: MouseEvent) {
    e.stopPropagation();
    openDropdownId = openDropdownId === id ? null : id;
  }

  $effect(() => {
    const handleGlobalClick = () => { openDropdownId = null; };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });
</script>

<div class="space-y-6">

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
      <Button
        variant="ghost"
        onclick={() => { activeTab = 'pending'; errorMsg = null; successMsg = null; }}
        class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px flex items-center gap-1.5 rounded-none h-auto bg-transparent border-t-0 border-x-0 {activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        <Clock class="h-4 w-4" />
        Demandes en attente ({pendingOrders.length})
      </Button>
      <Button
        variant="ghost"
        onclick={() => { activeTab = 'history'; errorMsg = null; successMsg = null; }}
        class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px flex items-center gap-1.5 rounded-none h-auto bg-transparent border-t-0 border-x-0 {activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        <History class="h-4 w-4" />
        Historique ({historyOrders.length})
      </Button>
    </div>

    <div class="relative w-full sm:w-64 pb-2 sm:pb-0">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Rechercher une commande..."
        bind:value={searchTerm}
        class="pl-9 pr-3 py-1.5 w-full text-sm h-8"
      />
    </div>
  </div>

  <!-- Tab Contents -->
  {#if activeTab === 'pending'}
    <div class="space-y-8">
      {#if pendingOrders.length === 0}
        <Card.Root class="p-8 text-center text-muted-foreground">
          <Card.Content class="p-0">
            <Clock class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            Aucune commande en attente.
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root class="overflow-hidden shadow-sm">
          <Card.Content class="p-0">
            <div class="overflow-x-auto min-h-[180px]">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Date</Table.Head>
                    <Table.Head>Adhérent</Table.Head>
                    <Table.Head>Article</Table.Head>
                    <Table.Head class="text-center">Quantité</Table.Head>
                    <Table.Head>Paiement</Table.Head>
                    <Table.Head class="text-right">Total</Table.Head>
                    <Table.Head class="text-right">Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each pendingOrders as item (item.order.id)}
                    <Table.Row class="hover:bg-muted/50 transition-colors">
                      <Table.Cell class="text-muted-foreground whitespace-nowrap">
                        {new Date(item.order.createdAt).toLocaleDateString('fr-FR')}
                      </Table.Cell>
                      <Table.Cell>
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
                      </Table.Cell>
                      <Table.Cell>
                        {#if item.product}
                          <div class="font-medium text-foreground">{item.product.name}</div>
                        {:else}
                          <span class="text-xs text-muted-foreground italic">Produit supprimé</span>
                        {/if}
                      </Table.Cell>
                      <Table.Cell class="text-center font-semibold text-foreground">
                        {item.order.quantity}
                      </Table.Cell>
                      <Table.Cell class="whitespace-nowrap">
                        <Badge variant="outline">
                          {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell class="text-right font-bold text-foreground">
                        {(item.order.totalAmount / 100).toFixed(2)} €
                      </Table.Cell>
                      <Table.Cell class="text-right relative">
                        <div class="inline-block text-left">
                          <Button 
                            variant="ghost"
                            size="icon"
                            onclick={(e) => toggleDropdown(item.order.id, e)} 
                            class="text-muted-foreground hover:text-foreground h-8 w-8 cursor-pointer" 
                            aria-label="Actions"
                          >
                            <MoreVertical class="w-4 h-4" />
                          </Button>

                          {#if openDropdownId === item.order.id}
                            <div class="absolute right-4 mt-1 w-36 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border font-medium">
                              <Button
                                variant="ghost"
                                onclick={() => handleApprove(item.order.id)}
                                disabled={processingId !== null || isClosed}
                                class="w-full px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 font-semibold flex items-center gap-1.5 cursor-pointer rounded-none justify-start h-auto bg-transparent border-0"
                              >
                                <Check class="w-3.5 h-3.5" />
                                Valider
                              </Button>
                              <Button
                                variant="ghost"
                                onclick={() => handleReject(item.order.id)}
                                disabled={processingId !== null || isClosed}
                                class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer rounded-none justify-start h-auto bg-transparent border-0"
                              >
                                <X class="w-3.5 h-3.5" />
                                Refuser
                              </Button>
                            </div>
                          {/if}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  {:else}
    <div class="space-y-8">
      {#if historyOrders.length === 0}
        <Card.Root class="p-8 text-center text-muted-foreground">
          <Card.Content class="p-0">
            <History class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            Aucun historique de commande disponible.
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root class="overflow-hidden shadow-sm">
          <Card.Content class="p-0">
            <div class="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Date</Table.Head>
                    <Table.Head>Adhérent</Table.Head>
                    <Table.Head>Article</Table.Head>
                    <Table.Head class="text-center">Quantité</Table.Head>
                    <Table.Head>Paiement</Table.Head>
                    <Table.Head class="text-right">Total</Table.Head>
                    <Table.Head class="text-center">Statut</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each historyOrders as item (item.order.id)}
                    <Table.Row class="hover:bg-muted/50 transition-colors">
                      <Table.Cell class="text-muted-foreground whitespace-nowrap">
                        {new Date(item.order.createdAt).toLocaleDateString('fr-FR')}
                      </Table.Cell>
                      <Table.Cell>
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
                      </Table.Cell>
                      <Table.Cell>
                        {#if item.product}
                          <span class="font-medium text-foreground">{item.product.name}</span>
                        {:else}
                          <span class="text-xs text-muted-foreground italic">Produit supprimé</span>
                        {/if}
                      </Table.Cell>
                      <Table.Cell class="text-center font-semibold text-foreground">
                        {item.order.quantity}
                      </Table.Cell>
                      <Table.Cell class="whitespace-nowrap">
                        <Badge variant="outline">
                          {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell class="text-right font-bold text-foreground">
                        {(item.order.totalAmount / 100).toFixed(2)} €
                      </Table.Cell>
                      <Table.Cell class="text-center">
                        {#if item.order.status === 'approved'}
                          <Badge variant="secondary" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1">
                            <Check class="w-3 h-3" />
                            Validée
                          </Badge>
                          {#if item.order.transactionId}
                            <div class="text-[10px] text-muted-foreground mt-0.5">
                              Tx: #{item.order.transactionId}
                            </div>
                          {/if}
                        {:else if item.order.status === 'rejected'}
                          <Badge variant="destructive" class="bg-destructive/10 text-destructive hover:bg-destructive/10 font-semibold gap-1">
                            <X class="w-3 h-3" />
                            Refusée
                          </Badge>
                        {/if}
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  {/if}
</div>
