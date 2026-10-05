<script lang="ts">
  import { onMount } from 'svelte';
  import { softNavigate, uiAlert, correspondA } from '@nba/ui';
  import { VUES_CLOSES, type OrderItem, type OrdersTab, type Season } from './orders-manager-types';
  import {
    validateOrder,
    payOrder,
    rejectOrder,
    cancelOrder,
    unpayOrder,
    deliverOrder,
    undeliverOrder
  } from './orders-manager-actions';
  import {
    articleDeCommande,
    articlesCommandes,
    codeDeSaison,
    commandesCsv,
    estOuverte,
    etapeOuverte,
    type EtapeOuverte
  } from './orders-row-model';
  import OrdersOpenTable from './OrdersOpenTable.svelte';
  import OrdersHistoryTable from './OrdersHistoryTable.svelte';
  import OrdersToolbar from './OrdersToolbar.svelte';
  import OrderDetailSheet from './OrderDetailSheet.svelte';
  import AdminOrderForm from './AdminOrderForm.svelte';
  import RejectOrderSheet from './RejectOrderSheet.svelte';

  let {
    seasons = [],
    orders = [],
    products = [],
    members = [],
    seasonId,
    initialAction = null,
    activeTab = $bindable('open'),
    paymentMethods = [],
    canWrite = false,
    canApprove = false,
    canPay = false
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
    /** `shop:orders:write` : créer une commande, et corriger une commande encore ouverte. */
    canWrite?: boolean;
    /** `shop:orders:approve` : valider, refuser, annuler, livrer et défaire une remise. */
    canApprove?: boolean;
    /** `shop:payments:write` : encaisser et défaire un encaissement — la trésorerie seule. */
    canPay?: boolean;
  } = $props();

  const droits = $derived({ decider: canApprove, encaisser: canPay });
  /** Défaire une remise relève de la même décision que livrer. */
  const surAnnulationRemise = $derived(canApprove ? (id: number) => handleUndeliver(id) : undefined);

  const isClosed = $derived(seasons.find((s) => codeDeSaison(s) === seasonId)?.closed || false);

  // svelte-ignore state_referenced_locally
  let ordersList = $state<OrderItem[]>(orders);

  /*
    Les critères vivent dans l'URL. Chaque décision — valider, encaisser, refuser —
    recharge l'écran pour montrer l'état frais, et tout ce qui n'était qu'en mémoire
    repartait à zéro : on filtrait l'opération maillots, on validait une commande, et
    l'on retombait sur toutes les commandes en cours. Lus au montage, réécrits à chaque
    changement, ils survivent au rechargement comme au partage du lien.
  */
  const VUES_VALIDES: readonly OrdersTab[] = ['open', 'created', 'awaiting_payment', 'paid', 'delivered', 'closed'];
  const parametresInitiaux =
    typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const vueInitiale = parametresInitiaux.get('vue') as OrdersTab | null;
  if (vueInitiale && VUES_VALIDES.includes(vueInitiale)) activeTab = vueInitiale;

  let searchTerm = $state(parametresInitiaux.get('q') ?? '');
  /** Identifiant du produit parent ; vide pour tous les articles. */
  let articleChoisi = $state(parametresInitiaux.get('article') ?? '');

  $effect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const poser = (cle: string, valeur: string, defaut = '') =>
      valeur && valeur !== defaut ? params.set(cle, valeur) : params.delete(cle);
    poser('vue', activeTab, 'open');
    poser('q', searchTerm.trim());
    poser('article', articleChoisi);
    const qs = params.toString();
    const cible = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (cible !== `${window.location.pathname}${window.location.search}`) {
      // L'état d'historique est gardé : le routeur d'Astro y range le sien.
      window.history.replaceState(window.history.state, '', cible);
    }
  });
  let processingId = $state<number | null>(null);
  let isCreateSheetOpen = $state(initialAction === 'new-order');
  /** La commande en cours de correction ; `null` quand le formulaire crée. */
  let commandeEnEdition = $state<OrderItem | null>(null);
  // La feuille refermée, le formulaire redevient celui de la création.
  $effect(() => {
    if (!isCreateSheetOpen) commandeEnEdition = null;
  });

  /** La commande dont on regarde la fiche. Au doigt seulement : le tableau montre tout. */
  let detailItem = $state<OrderItem | null>(null);
  let detailOuvert = $state(false);

  /** La commande qu'on s'apprête à refuser : la feuille demande le motif. */
  let refusItem = $state<OrderItem | null>(null);
  let refusOuvert = $state(false);

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

  /** Les articles commandés dans la saison, pour le choix du filtre. */
  const articles = $derived(articlesCommandes(ordersList));

  let filteredOrders = $derived(
    ordersList.filter((item) =>
      (!articleChoisi || articleDeCommande(item)?.value === articleChoisi) &&
      correspondA(
        searchTerm,
        `${item.member?.lastName || ''} ${item.member?.firstName || ''}`,
        item.member?.licence || '',
        item.product?.name || '',
        item.order.paymentMethodLabel || item.order.paymentMethod,
        (item.order.totalAmount / 100).toFixed(2)
      )
    )
  );

  const createdOrders = $derived(filteredOrders.filter((item) => item.order.status === 'created'));
  const awaitingPaymentOrders = $derived(
    filteredOrders.filter((item) => item.order.status === 'awaiting_payment')
  );
  const paidOrders = $derived(filteredOrders.filter((item) => item.order.status === 'paid'));
  // Tout ce qui attend encore quelque chose du club : une décision, un règlement, une remise.
  const openOrders = $derived(filteredOrders.filter(estOuverte));
  const deliveredOrders = $derived(filteredOrders.filter((item) => item.order.status === 'delivered'));
  // Les deux issues sans suite : demande refusée, commande jamais réglée.
  const closedOrders = $derived(
    filteredOrders.filter((item) => item.order.status === 'rejected' || item.order.status === 'cancelled')
  );

  const counts = $derived({
    open: openOrders.length,
    created: createdOrders.length,
    awaiting_payment: awaitingPaymentOrders.length,
    paid: paidOrders.length,
    delivered: deliveredOrders.length,
    closed: closedOrders.length
  });

  const vueCourante = $derived(
    activeTab === 'created'
      ? createdOrders
      : activeTab === 'awaiting_payment'
        ? awaitingPaymentOrders
        : activeTab === 'paid'
          ? paidOrders
          : activeTab === 'delivered'
            ? deliveredOrders
            : activeTab === 'closed'
              ? closedOrders
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
  /**
   * Le refus passe par sa feuille, où se saisit le motif. Tous les chemins y mènent :
   * menu de ligne, balayage et fiche de détail.
   */
  const handleReject = (orderId: number) => {
    if (processingId !== null || isClosed) return;
    refusItem = ordersList.find((o) => o.order.id === orderId) ?? null;
    refusOuvert = refusItem !== null;
  };

  /** Le refus d'API s'affiche dans la feuille, qui reste ouverte. */
  async function refuser(orderId: number, reason: string): Promise<string | null> {
    processingId = orderId;
    const res = await rejectOrder(orderId, reason);
    processingId = null;
    return res.success ? null : (res.error ?? 'Erreur lors du refus');
  }
  const handleCancel = (orderId: number) => runTransition(orderId, cancelOrder);
  const handleUnpay = (orderId: number) => runTransition(orderId, unpayOrder);
  const handleDeliver = (orderId: number) => runTransition(orderId, deliverOrder);
  const handleUndeliver = (orderId: number) => runTransition(orderId, undeliverOrder);

  /** Le couple d'actions de chaque étape : primaire, puis secondaire. */
  const TRANSITIONS: Record<EtapeOuverte, [(id: number) => void, (id: number) => void]> = {
    created: [handleValidate, handleReject],
    awaiting_payment: [handlePay, handleCancel],
    paid: [handleDeliver, handleUnpay]
  };

  // Dans la vue réunie, chaque ligne suit les transitions de sa propre étape.
  const etapeDe = (orderId: number) => {
    const item = ordersList.find((o) => o.order.id === orderId);
    return item ? etapeOuverte(item) : 'created';
  };
  const handleOpenPrimary = (orderId: number) => TRANSITIONS[etapeDe(orderId)][0](orderId);
  const handleOpenSecondary = (orderId: number) => TRANSITIONS[etapeDe(orderId)][1](orderId);

  /** Absent sans le droit, ou saison close : l'action n'est alors offerte nulle part. */
  const handleEdit = $derived(
    canWrite && !isClosed
      ? (item: OrderItem) => {
          commandeEnEdition = item;
          isCreateSheetOpen = true;
        }
      : undefined
  );

  /**
   * Télécharge les commandes affichées, filtres compris, en CSV.
   *
   * Généré dans le navigateur à partir de la liste déjà chargée : c'est la seule
   * façon d'honorer à coup sûr la vue, l'article et la recherche en cours, que le
   * serveur ne connaît pas.
   */
  function exporter() {
    const csv = commandesCsv(vueCourante);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const article = articles.find((a) => a.value === articleChoisi)?.label;
    const suffixe = article
      ? `-${article.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
      : '';
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(blob);
    lien.download = `commandes-${seasonId}${suffixe}.csv`;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(lien.href), 0);
  }

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
    bind:articleChoisi
    {articles}
    {seasons}
    {counts}
    resultCount={vueCourante.length}
    canCreate={!isClosed}
    onCreate={() => (isCreateSheetOpen = true)}
    onExport={vueCourante.length > 0 ? exporter : undefined}
  />
{/snippet}

<div class="space-y-6">
  {#if VUES_CLOSES.includes(activeTab)}
    <OrdersHistoryTable
      historyOrders={vueCourante}
      vue={activeTab}
      {isClosed}
      toolbar={barreDOutils}
      onUndeliver={surAnnulationRemise}
      onOuvrir={ouvrirFiche}
      {droits}
    />
  {:else}
    <OrdersOpenTable
      orders={vueCourante}
      stage={activeTab}
      {isClosed}
      toolbar={barreDOutils}
      onPrimary={activeTab === 'open' ? handleOpenPrimary : TRANSITIONS[activeTab as EtapeOuverte][0]}
      onSecondary={activeTab === 'open' ? handleOpenSecondary : TRANSITIONS[activeTab as EtapeOuverte][1]}
      onOuvrir={ouvrirFiche}
      onEdit={handleEdit}
      {droits}
    />
  {/if}
</div>

<OrderDetailSheet
  bind:open={detailOuvert}
  item={detailItem}
  verrouille={isClosed}
  onPrimary={handleOpenPrimary}
  onSecondary={handleOpenSecondary}
  onUndeliver={surAnnulationRemise}
  onEdit={handleEdit}
  {droits}
/>

<RejectOrderSheet bind:open={refusOuvert} item={refusItem} onReject={refuser} />

<AdminOrderForm
  bind:open={isCreateSheetOpen}
  {products}
  {members}
  {paymentMethods}
  activeSeasonId={seasonId}
  commande={commandeEnEdition}
/>
