<script module>
  export * from './orders-manager-types';
  export * from './orders-manager-actions';
</script>
<script lang="ts">
  import { AlertCircle } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { Alert, Button, Sheet, flashAndReload, toSeasonOptions } from "@nba/ui";
  import type { OrderItem, OrdersTab, Season } from './orders-manager-types';
  import { paymentMethodLabels } from './orders-manager-types';
  import { validateOrder, payOrder, rejectOrder, cancelOrder } from './orders-manager-actions';
  import OrdersOpenTable from './OrdersOpenTable.svelte';
  import OrdersHistoryTable from './OrdersHistoryTable.svelte';
  import AdminOrderForm from './AdminOrderForm.svelte';
  import { SearchableCombobox, FormField, softNavigate } from "@nba/ui";

  let {
    seasons = [],
    orders = [],
    products = [],
    members = [],
    seasonId,
    initialAction = null,
    activeTab = $bindable('created')
  }: {
    seasons: Season[];
    orders: OrderItem[];
    products?: any[];
    members?: any[];
    seasonId: string;
    initialAction?: string | null;
    activeTab?: OrdersTab;
  } = $props();

  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);

  // svelte-ignore state_referenced_locally
  let ordersList = $state<OrderItem[]>(orders);
  let searchTerm = $state('');
  let processingId = $state<number | null>(null);
  let errorMsg = $state<string | null>(null);
  let isCreateSheetOpen = $state(initialAction === 'new-order');

  onMount(() => {
    const handleOpenNewOrder = () => isCreateSheetOpen = true;
    window.addEventListener('open-new-order', handleOpenNewOrder);
    return () => window.removeEventListener('open-new-order', handleOpenNewOrder);
  });

  $effect(() => {
    ordersList = orders;
  });

  $effect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new-order') {
        params.delete('action');
        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  });

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);

  $effect(() => {
    if (selectedSeason !== seasonId) {
      const params = new URLSearchParams(window.location.search);
      params.set('season', selectedSeason);
      softNavigate(`/admin/shop/orders?${params.toString()}`);
    }
  });

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

  let createdOrders = $derived(filteredOrders.filter(item => item.order.status === 'created'));
  let awaitingPaymentOrders = $derived(filteredOrders.filter(item => item.order.status === 'awaiting_payment'));
  let historyOrders = $derived(
    filteredOrders.filter(item =>
      item.order.status === 'paid' ||
      item.order.status === 'rejected' ||
      item.order.status === 'cancelled'
    )
  );

  /**
   * Toutes les transitions passent par ici : en cas de succès l'action a déjà
   * déclenché `flashAndReload`, la page est rechargée avec l'état frais. Seul un
   * refus revient ici, et laisse la liste en l'état avec l'erreur affichée.
   */
  async function runTransition(orderId: number, action: (id: number) => Promise<{ success: boolean; error?: string }>) {
    if (processingId !== null || isClosed) return;
    errorMsg = null;
    processingId = orderId;

    const res = await action(orderId);
    if (!res.success && res.error) {
      errorMsg = res.error;
    }
    processingId = null;
  }

  const handleValidate = (orderId: number) => runTransition(orderId, validateOrder);
  const handlePay = (orderId: number) => runTransition(orderId, (id) => payOrder(id));
  const handleReject = (orderId: number) => runTransition(orderId, rejectOrder);
  const handleCancel = (orderId: number) => runTransition(orderId, cancelOrder);
</script>

<div class="space-y-6">
  {#if errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-5 h-5 shrink-0" />
    <Alert.Description>{errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#snippet toolbarFilters()}
    <FormField id="filter-season" label="Saison">
      <SearchableCombobox 
        id="filter-season" 
        items={seasons.length > 0 ? toSeasonOptions(seasons, { value: 'id' }) : [{ label: 'Saison 2025-2026', value: '25-26' }]}
        bind:value={selectedSeason} 
      />
    </FormField>
    <FormField id="filter-status" label="Statut">
      <SearchableCombobox 
        id="filter-status" 
        items={[
          { label: `À valider (${createdOrders.length})`, value: 'created' },
          { label: `En attente de paiement (${awaitingPaymentOrders.length})`, value: 'awaiting_payment' },
          { label: 'Historique', value: 'history' }
        ]}
        bind:value={activeTab}
      />
    </FormField>
  {/snippet}

  {#snippet toolbarActions()}
    <Button variant="default" class="h-9 gap-2 w-full sm:w-auto" onclick={() => isCreateSheetOpen = true}>
      Créer une commande
    </Button>
  {/snippet}

  {#if activeTab === 'created'}
    <OrdersOpenTable
      orders={createdOrders}
      stage="created"
      {processingId}
      {isClosed}
      {toolbarFilters}
      {toolbarActions}
      bind:searchTerm
      onPrimary={handleValidate}
      onSecondary={handleReject}
    />
  {:else if activeTab === 'awaiting_payment'}
    <OrdersOpenTable
      orders={awaitingPaymentOrders}
      stage="awaiting_payment"
      {processingId}
      {isClosed}
      {toolbarFilters}
      {toolbarActions}
      bind:searchTerm
      onPrimary={handlePay}
      onSecondary={handleCancel}
    />
  {:else}
    <OrdersHistoryTable 
      {historyOrders}
      {toolbarFilters}
      {toolbarActions}
      bind:searchTerm
    />
  {/if}
</div>

<Sheet.Root bind:open={isCreateSheetOpen}>
  <Sheet.Content side="right" class="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col h-full" onOpenAutoFocus={(e) => e.preventDefault()}>
    <AdminOrderForm
      products={products}
      members={members}
      activeSeasonId={seasonId}
      onClose={() => isCreateSheetOpen = false}
      onSuccess={(msg) => {
        isCreateSheetOpen = false;
        flashAndReload(msg, 'success');
      }}
    />
  </Sheet.Content>
</Sheet.Root>
