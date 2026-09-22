<script lang="ts">
  import { onMount } from 'svelte';
  import { softNavigate, uiAlert } from '@nba/ui';
  import type { OrderItem, OrdersTab, Season } from './orders-manager-types';
  import { validateOrder, payOrder, rejectOrder, cancelOrder, unpayOrder } from './orders-manager-actions';
  import { codeDeSaison, estOuverte, etapeOuverte } from './orders-row-model';
  import OrdersOpenTable from './OrdersOpenTable.svelte';
  import OrdersHistoryTable from './OrdersHistoryTable.svelte';
  import OrdersToolbar from './OrdersToolbar.svelte';
  import OrderDetailSheet from './OrderDetailSheet.svelte';
  import AdminOrderForm from './AdminOrderForm.svelte';

  let {
    seasons = [],
    orders = [],
    products = [],
    members = [],
    seasonId,
    initialAction = null,
    activeTab = $bindable('open'),
    paymentMethods = []
  }: {
    seasons: Season[];
    orders: OrderItem[];
    products?: any[];
    /** Les moyens de paiement proposés au bureau (configuration du club). */
    paymentMethods?: import('../../list-products/ui/catalog-types').PaymentMethodOption[];
    members?: any[];
    seasonId: string;
    initialAction?: string | null;
    activeTab?: OrdersTab;
  } = $props();

  const isClosed = $derived(seasons.find((s) => codeDeSaison(s) === seasonId)?.closed || false);

  // svelte-ignore state_referenced_locally
  let ordersList = $state<OrderItem[]>(orders);
  let searchTerm = $state('');
  let processingId = $state<number | null>(null);
  let isCreateSheetOpen = $state(initialAction === 'new-order');

  /** La commande dont on regarde la fiche. Au doigt seulement : le tableau montre tout. */
  let detailItem = $state<OrderItem | null>(null);
  let detailOuvert = $state(false);

  onMount(() => {
    const handleOpenNewOrder = () => (isCreateSheetOpen = true);
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
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
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
    ordersList.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;

      const memberName = `${item.member?.lastName || ''} ${item.member?.firstName || ''}`.toLowerCase();
      const licence = (item.member?.licence || '').toLowerCase();
      const productName = (item.product?.name || '').toLowerCase();
      const paymentMethod = (item.order.paymentMethodLabel || item.order.paymentMethod).toLowerCase();
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

  const createdOrders = $derived(filteredOrders.filter((item) => item.order.status === 'created'));
  const awaitingPaymentOrders = $derived(
    filteredOrders.filter((item) => item.order.status === 'awaiting_payment')
  );
  // Tout ce qui attend encore quelque chose du club : une décision, puis un règlement.
  const openOrders = $derived(filteredOrders.filter(estOuverte));
  const historyOrders = $derived(filteredOrders.filter((item) => !estOuverte(item)));

  const counts = $derived({
    open: openOrders.length,
    created: createdOrders.length,
    awaiting_payment: awaitingPaymentOrders.length,
    history: historyOrders.length
  });

  const vueCourante = $derived(
    activeTab === 'created'
      ? createdOrders
      : activeTab === 'awaiting_payment'
        ? awaitingPaymentOrders
        : activeTab === 'history'
          ? historyOrders
          : openOrders
  );

  /**
   * Toutes les transitions passent par ici : en cas de succès l'action a déjà
   * déclenché `flashAndReload`, la page est rechargée avec l'état frais. Seul un
   * refus revient ici, et se dit dans une alerte à acquitter — la liste peut être
   * défilée loin de son sommet, où un message posé en tête passerait inaperçu.
   */
  async function runTransition(
    orderId: number,
    action: (id: number) => Promise<{ success: boolean; error?: string }>
  ) {
    if (processingId !== null || isClosed) return;
    processingId = orderId;

    const res = await action(orderId);
    if (!res.success && res.error) await uiAlert(res.error);
    processingId = null;
  }

  const handleValidate = (orderId: number) => runTransition(orderId, validateOrder);
  const handlePay = (orderId: number) => runTransition(orderId, (id) => payOrder(id));
  const handleReject = (orderId: number) => runTransition(orderId, rejectOrder);
  const handleCancel = (orderId: number) => runTransition(orderId, cancelOrder);
  const handleUnpay = (orderId: number) => runTransition(orderId, unpayOrder);

  // Dans la vue réunie, chaque ligne suit les transitions de sa propre étape.
  const etapeDe = (orderId: number) => {
    const item = ordersList.find((o) => o.order.id === orderId);
    return item ? etapeOuverte(item) : 'created';
  };
  const handleOpenPrimary = (orderId: number) =>
    (etapeDe(orderId) === 'awaiting_payment' ? handlePay : handleValidate)(orderId);
  const handleOpenSecondary = (orderId: number) =>
    (etapeDe(orderId) === 'awaiting_payment' ? handleCancel : handleReject)(orderId);

  function ouvrirFiche(item: OrderItem) {
    detailItem = item;
    detailOuvert = true;
  }
</script>

{#snippet barreDOutils()}
  <OrdersToolbar
    bind:searchTerm
    bind:selectedSeason
    bind:activeTab
    {seasons}
    {counts}
    resultCount={vueCourante.length}
    canCreate={!isClosed}
    onCreate={() => (isCreateSheetOpen = true)}
  />
{/snippet}

<div class="space-y-6">
  {#if activeTab === 'history'}
    <OrdersHistoryTable
      {historyOrders}
      {isClosed}
      toolbar={barreDOutils}
      onUnpay={handleUnpay}
      onOuvrir={ouvrirFiche}
    />
  {:else}
    <OrdersOpenTable
      orders={vueCourante}
      stage={activeTab}
      {isClosed}
      toolbar={barreDOutils}
      onPrimary={activeTab === 'open'
        ? handleOpenPrimary
        : activeTab === 'created'
          ? handleValidate
          : handlePay}
      onSecondary={activeTab === 'open'
        ? handleOpenSecondary
        : activeTab === 'created'
          ? handleReject
          : handleCancel}
      onOuvrir={ouvrirFiche}
    />
  {/if}
</div>

<OrderDetailSheet
  bind:open={detailOuvert}
  item={detailItem}
  verrouille={isClosed}
  onPrimary={handleOpenPrimary}
  onSecondary={handleOpenSecondary}
  onUnpay={handleUnpay}
/>

<AdminOrderForm
  bind:open={isCreateSheetOpen}
  {products}
  {members}
  {paymentMethods}
  activeSeasonId={seasonId}
/>
