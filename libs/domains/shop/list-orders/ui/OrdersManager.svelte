<script module>
  export * from './orders-manager-types';
  export * from './orders-manager-actions';
</script>
<script lang="ts">
  import { Check, AlertCircle } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { Alert, Button, Sheet, flashAndReload } from"@nba/ui";
  import type { OrderItem, Season } from './orders-manager-types';
  import { paymentMethodLabels } from './orders-manager-types';
  import { approveOrder, rejectOrder } from './orders-manager-actions';
  import OrdersPendingTable from './OrdersPendingTable.svelte';
  import OrdersHistoryTable from './OrdersHistoryTable.svelte';
  import AdminOrderForm from './AdminOrderForm.svelte';
  import { SearchableCombobox, FormField } from "@nba/ui";

  let {
    seasons = [],
    orders = [],
    products = [],
    members = [],
    seasonId,
    initialAction = null,
    activeTab = $bindable('pending')
  }: {
    seasons: Season[];
    orders: OrderItem[];
    products?: any[];
    members?: any[];
    seasonId: string;
    initialAction?: string | null;
    activeTab?: 'pending' | 'history';
  } = $props();

  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);

  // svelte-ignore state_referenced_locally
  let ordersList = $state<OrderItem[]>(orders);
  let searchTerm = $state('');
  let processingId = $state<number | null>(null);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);
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
      window.location.href = `/admin/shop/orders?${params.toString()}`;
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

  {#snippet toolbarFilters()}
    <FormField id="filter-season" label="Saison">
      <SearchableCombobox 
        id="filter-season" 
        items={seasons.length > 0 ? seasons.map((s) => ({ label: s.name, value: String(s.id) })) : [{ label: 'Saison 2025-2026', value: '25-26' }]}
        bind:value={selectedSeason} 
      />
    </FormField>
    <FormField id="filter-status" label="Statut">
      <SearchableCombobox 
        id="filter-status" 
        items={[
          { label: `En attente (${pendingOrders.length})`, value: 'pending' }, 
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

  {#if activeTab === 'pending'}
    <OrdersPendingTable
      {pendingOrders}
      {processingId}
      {isClosed}
      {toolbarFilters}
      {toolbarActions}
      bind:searchTerm
      onApprove={handleApprove}
      onReject={handleReject}
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
