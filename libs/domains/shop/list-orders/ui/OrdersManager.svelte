<script module>
  export * from './orders-manager-types';
  export * from './orders-manager-actions';
</script>
<script lang="ts">
  import { Check, AlertCircle } from "@lucide/svelte";
  import { Tabs, Alert } from"@nba/ui";
  import type { OrderItem, Season } from './orders-manager-types';
  import { paymentMethodLabels } from './orders-manager-types';
  import { approveOrder, rejectOrder } from './orders-manager-actions';
  import OrdersTabsNav from './OrdersTabsNav.svelte';
  import OrdersPendingTable from './OrdersPendingTable.svelte';
  import OrdersHistoryTable from './OrdersHistoryTable.svelte';

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

  // svelte-ignore state_referenced_locally
  let ordersList = $state<OrderItem[]>(orders);
  let activeTab = $state<'pending' | 'history'>('pending');
  let searchTerm = $state('');
  let processingId = $state<number | null>(null);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  $effect(() => {
    ordersList = orders;
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

  let pendingOrders = $derived(filteredOrders.filter(item => item.order.status === 'pending'));
  let historyOrders = $derived(filteredOrders.filter(item => item.order.status === 'approved' || item.order.status === 'rejected'));

  async function handleApprove(orderId: number) {
    if (processingId !== null || isClosed) return;
    errorMsg = null;
    successMsg = null;
    processingId = orderId;

    const res = await approveOrder(orderId);
    if (!res.success) {
      errorMsg = res.error || 'Une erreur est survenue';
    } else {
      successMsg = 'Commande validée avec succès !';
      const index = ordersList.findIndex(o => o.order.id === orderId);
      if (index !== -1) {
        ordersList[index].order.status = 'approved';
        if (ordersList[index].product) {
          ordersList[index].product!.stock = Math.max(0, ordersList[index].product!.stock - ordersList[index].order.quantity);
        }
      }
    }
    processingId = null;
  }

  async function handleReject(orderId: number) {
    if (processingId !== null || isClosed) return;
    errorMsg = null;
    successMsg = null;

    const res = await rejectOrder(orderId);
    if (res.error) {
      errorMsg = res.error;
    } else if (res.success) {
      processingId = orderId;
      successMsg = 'Commande refusée avec succès.';
      const index = ordersList.findIndex(o => o.order.id === orderId);
      if (index !== -1) {
        ordersList[index].order.status = 'rejected';
      }
      processingId = null;
    }
  }
</script>

<div class="space-y-6">
  {#if errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-5 h-5 shrink-0" />
    <Alert.Description>{errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if successMsg}
    <Alert.Root variant="success">
      <Check class="w-5 h-5 shrink-0" />
    <Alert.Description>{successMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  <Tabs.Root value={activeTab} onValueChange={(v) => { activeTab = v as any; errorMsg = null; successMsg = null; }}>
    {#snippet tabsNav()}
      <OrdersTabsNav
        pendingCount={pendingOrders.length}
        historyCount={historyOrders.length}
      />
    {/snippet}

    <Tabs.Content value="pending">
      {#if activeTab === 'pending'}
        <OrdersPendingTable
          {pendingOrders}
          {processingId}
          {isClosed}
          {seasonId}
          {seasons}
          {tabsNav}
          bind:searchTerm
          onApprove={handleApprove}
          onReject={handleReject}
        />
      {/if}
    </Tabs.Content>

    <Tabs.Content value="history">
      {#if activeTab === 'history'}
        <OrdersHistoryTable 
          {historyOrders}
          {seasonId}
          {seasons}
          {tabsNav}
          bind:searchTerm
        />
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
