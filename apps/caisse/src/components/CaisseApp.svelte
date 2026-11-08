<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Banknote, Check, ChevronLeft, ChevronRight, CreditCard, Plus, QrCode, RotateCcw, ScanLine, ShoppingBasket } from '@lucide/svelte';
  import { Button, Input } from '@nba/ui';
  import MoneyHandover from './MoneyHandover.svelte';
  import { ItemIcon } from '@nba/buvette-ui';
  import CaisseNav from './CaisseNav.svelte';
  import QrScanner from './QrScanner.svelte';
  import { isIosDevice, sumUpLink } from '../lib/sumup-link';
  import { callApi, formatEuros, itemsTotal, newClientId, parseEuros, splitPayment, suggestedNotes, type CatalogItem } from '../lib/cart';

  interface Props {
    affiliateKey: string;
    clubName: string;
  }

  interface InProgress {
    saleId: number;
    cardCents: number;
    prepaidCents: number;
    rechargeCents: number;
    foreignTxId: string | null;
    attemptStatus: string | null;
  }

  interface SessionSale {
    kind: 'sale';
    id: number;
    status: 'in_progress' | 'paid' | 'cancelled';
    createdAt: string;
    itemsCents: number;
    rechargeCents: number;
    prepaidCents: number;
    cashCents: number;
    cardCents: number;
    prepaidCardLabel: string | null;
    prepaidCardDeleted: boolean;
    transactionCode: string | null;
    cardAttemptId: number | null;
    cardRefundStatus: 'pending' | 'done' | 'failed' | 'cash' | null;
    lines: { name: string; quantity: number; unitPriceCents: number }[];
  }

  interface SessionCardRefund {
    kind: 'card_refund';
    id: number;
    createdAt: string;
    amountCents: number;
    cardLabel: string;
  }

  interface CardRefund {
    attemptId: number;
    status: 'done' | 'pending' | 'failed';
    amountCents: number;
    transactionCode: string | null;
    error: string | null;
  }

  interface PendingOrder {
    id: number;
    number: number;
    createdAt: string;
    label: string;
    availableCents: number;
    totalCents: number;
    lines: { name: string; quantity: number; unitPriceCents: number; available: boolean }[];
  }

  interface ScannedCard {
    scanToken: string;
    label: string;
    balanceCents: number;
    pendingOrderId?: number | null;
    kind?: 'account' | 'paper';
    paperStatus?: 'new' | 'active' | 'closed' | null;
    faceValueCents?: number | null;
    cbRefundableCents?: number;
  }

  type Screen = 'loading' | 'closed' | 'sell' | 'cart' | 'recharge' | 'scan' | 'pay' | 'cash' | 'cb' | 'done' | 'sales' | 'sale' | 'saleConfirm' | 'handover' | 'orders' | 'order' | 'refund';
  type ScanPurpose = 'prepaid' | 'recharge' | 'refund' | 'order';

  let { affiliateKey, clubName }: Props = $props();

  const RECHARGES = [500, 1000, 2000, 5000];

  let screen = $state<Screen>('loading');
  let items = $state<CatalogItem[]>([]);
  let current = $state<{
    session: { id: number };
    expectedCashCents: number;
    salesCount: number;
    cardCents: number;
    inProgress: InProgress[];
    toRefund: { kind: 'stray' | 'card_balance'; attemptId: number; transactionCode: string | null; amountCents: number; refundStatus: 'pending' | 'done' | 'failed' | 'cash' | null }[];
  } | null>(null);
  let cart = $state(new Map<number, number>());
  let rechargeCents = $state(0);
  let rechargeCard = $state<ScannedCard | null>(null);
  let pendingRechargeCents = 0;
  let prepaidCard = $state<ScannedCard | null>(null);
  let refundTarget = $state<ScannedCard | null>(null);
  let scanPurpose = $state<ScanPurpose>('prepaid');
  let amountInput = $state('');
  let error = $state('');
  let busy = $state(false);
  let done = $state<{ title: string; amountCents: number; changeCents: number | null; detail: string } | null>(null);
  let lastSale = $state<{ id: number; cashCents: number; cardCents: number; prepaidCents: number } | null>(null);
  /** Ce qu'un remboursement laisse à faire au bénévole : l'écran ne se ferme pas sans lui. */
  let handover = $state<{ cashCents: number; cardCents: number; sumUpCents: number; sumUp?: CardRefund | null; cbBack?: { amountCents: number; status: 'done' | 'pending' }[]; cashNotes?: { amountCents: number; reason: string }[] } | null>(null);
  let sales = $state<(SessionSale | SessionCardRefund)[]>([]);
  let selectedSale = $state<SessionSale | null>(null);
  let orders = $state<PendingOrder[]>([]);
  let orderSearch = $state('');
  let selectedOrder = $state<PendingOrder | null>(null);
  /** La commande en cours d'encaissement : ses articles et sa carte viennent d'elle. */
  let payingOrder = $state<PendingOrder | null>(null);
  let ordersTimer: ReturnType<typeof setInterval> | undefined;
  let doneTimer: ReturnType<typeof setTimeout> | undefined;
  // Le même identifiant tant que la vente n'a pas abouti : un nouvel essai réseau n'encaisse qu'une fois.
  let saleClientId = newClientId();
  let refundClientId = newClientId();

  /*
    Le menu reste partout, sauf là où partir ferait une erreur : le scan, une CB en attente, et
    les confirmations, dont celle des espèces à remettre.
  */
  const TAB_OF_SCREEN: Partial<Record<Screen, 'sell' | 'orders' | 'sales'>> = {
    sell: 'sell',
    cart: 'sell',
    recharge: 'sell',
    pay: 'sell',
    cash: 'sell',
    refund: 'sell',
    orders: 'orders',
    order: 'orders',
    sales: 'sales',
    sale: 'sales'
  };
  const activeTab = $derived(TAB_OF_SCREEN[screen] ?? null);
  const showNav = $derived(Boolean(current && activeTab && !(screen === 'refund' && refundTarget)));
  const activeItems = $derived(items.filter((i) => i.active));
  const itemsCents = $derived(payingOrder ? payingOrder.totalCents : itemsTotal(cart, items));
  const totalCents = $derived(itemsCents + rechargeCents);
  const articleCount = $derived([...cart.values()].reduce((sum, q) => sum + q, 0) + (rechargeCents > 0 ? 1 : 0));
  const split = $derived(splitPayment(itemsCents, rechargeCents, prepaidCard?.balanceCents ?? null));
  const cartEmpty = $derived(articleCount === 0);
  const pendingSale = $derived(current?.inProgress?.[0] ?? null);

  async function run(action: () => Promise<void>) {
    busy = true;
    error = '';
    try {
      await action();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Une erreur est survenue.';
    } finally {
      busy = false;
    }
  }

  async function refresh() {
    const [catalog, session] = await Promise.all([callApi<CatalogItem[]>('items'), callApi('sessions/current')]);
    items = catalog;
    current = session;
    return session;
  }

  async function reload() {
    const session = await refresh();
    screen = !session ? 'closed' : session.inProgress.length ? 'cb' : 'sell';
  }

  // Au retour de SumUp, la caisse relit le serveur : le retour peut s'être ouvert ailleurs.
  async function resume() {
    if (document.visibilityState !== 'visible' || screen !== 'cb' || !pendingSale?.foreignTxId) return;
    await verifyCard();
  }

  onMount(() => {
    run(async () => {
      await reload();
      await resume();
    });
    document.addEventListener('visibilitychange', resume);
    // Les commandes arrivent des téléphones : le compteur du menu les signale sans recharger.
    ordersTimer = setInterval(pollOrders, 15_000);
    pollOrders();
    return () => {
      clearInterval(ordersTimer);
      document.removeEventListener('visibilitychange', resume);
    };
  });

  onDestroy(() => clearTimeout(doneTimer));

  const time = (value: string) => new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const saleTitle = (sale: SessionSale) =>
    [...sale.lines.map((l) => `${l.quantity} × ${l.name}`), ...(sale.rechargeCents > 0 ? ['Recharge'] : [])].join(', ');
  const saleStatus = (sale: SessionSale) => (sale.status === 'cancelled' ? 'Remboursée' : sale.status === 'in_progress' ? 'CB en attente' : 'Payée');

  function go(next: Screen) {
    error = '';
    screen = next;
  }

  function add(id: number, delta: number) {
    const next = new Map(cart);
    const quantity = (next.get(id) ?? 0) + delta;
    if (quantity > 0) next.set(id, quantity);
    else next.delete(id);
    cart = next;
    if (screen === 'cart' && next.size === 0 && rechargeCents === 0) screen = 'sell';
  }

  function resetSale() {
    cart = new Map();
    rechargeCents = 0;
    rechargeCard = null;
    prepaidCard = null;
    payingOrder = null;
    selectedOrder = null;
    amountInput = '';
    saleClientId = newClientId();
  }

  function salePayload(extra: Record<string, unknown>) {
    if (payingOrder) return { clientId: saleClientId, lines: [], orderId: payingOrder.id, expectedOrderCents: payingOrder.totalCents, expectedCashCents: split.cashCents, ...extra };
    return {
      clientId: saleClientId,
      lines: [...cart].map(([itemId, quantity]) => ({ itemId, quantity })),
      ...(rechargeCents > 0 ? { rechargeCents, rechargeScanToken: rechargeCard?.scanToken } : {}),
      ...(prepaidCard ? { prepaidScanToken: prepaidCard.scanToken } : {}),
      expectedCashCents: split.cashCents,
      ...extra
    };
  }

  /** Rappel au bénévole : barrer les cases d'une carte papier après un achat. */
  const paperReminder = (card: ScannedCard | null, prepaid: number) =>
    card?.kind === 'paper' && prepaid > 0 ? `Barrez ${formatEuros(prepaid)} sur la carte papier.` : '';

  /** L'écran de fin. Sans monnaie à rendre, il s'efface seul : la vente suivante attend. */
  function showDone(next: NonNullable<typeof done>) {
    done = next;
    screen = 'done';
    clearTimeout(doneTimer);
    if (next.changeCents === null) doneTimer = setTimeout(newSale, 2500);
  }

  function newSale() {
    clearTimeout(doneTimer);
    done = null;
    screen = current ? 'sell' : 'closed';
  }

  function startScan(purpose: ScanPurpose) {
    scanPurpose = purpose;
    go('scan');
  }

  function cancelScan() {
    go(backFromScan(scanPurpose));
  }

  function backFromScan(purpose: ScanPurpose): Screen {
    return purpose === 'refund' ? 'refund' : purpose === 'recharge' ? 'recharge' : purpose === 'order' ? 'orders' : 'pay';
  }

  function chooseRecharge(cents: number) {
    pendingRechargeCents = cents;
    startScan('recharge');
  }

  function onScan(qrToken: string) {
    run(async () => {
      const purpose = scanPurpose;
      try {
        const card = await callApi<ScannedCard>('cards/scan', { qrToken });
        if (purpose === 'order') {
          if (!card.pendingOrderId) throw new Error(`Aucune commande en cours sur la carte ${card.label}.`);
          await showOrder(card.pendingOrderId);
        } else if (purpose === 'refund') {
          refundTarget = card;
          screen = 'refund';
        } else if (purpose === 'recharge') {
          if (card.kind === 'paper' && card.paperStatus !== 'new') throw new Error('Une carte papier ne se recharge pas : vendez-en une nouvelle.');
          rechargeCard = card;
          // Une carte papier se vend à sa valeur faciale, quel que soit le montant touché.
          rechargeCents = card.kind === 'paper' ? (card.faceValueCents ?? 0) : pendingRechargeCents;
          screen = 'sell';
        } else {
          if (card.kind === 'paper' && card.paperStatus === 'new') throw new Error("Cette carte papier n'a pas encore été vendue.");
          prepaidCard = card;
          screen = 'pay';
          // La carte couvre tout : le scan vaut paiement, comme une carte sur un terminal.
          if (splitPayment(itemsCents, rechargeCents, card.balanceCents).cashCents === 0) await confirmSale(null);
        }
      } catch (e) {
        screen = backFromScan(purpose);
        throw e;
      }
    });
  }

  /** `receivedCents` : ce que le bénévole confirme avoir reçu. Le serveur encaisse le reste en espèces. */
  async function confirmSale(receivedCents: number | null) {
    const cash = split.cashCents;
    const prepaid = split.prepaidCents;
    const { sale } = await callApi('sales', salePayload({}));
    lastSale = { id: sale.id, cashCents: sale.cashCents, cardCents: sale.cardCents, prepaidCents: sale.prepaidCents };
    const label = prepaidCard?.label ?? '';
    const reminder = paperReminder(prepaidCard, prepaid);
    resetSale();
    await refresh();
    showDone({
      title: 'Paiement enregistré',
      amountCents: sale.itemsCents + sale.rechargeCents,
      changeCents: receivedCents !== null && receivedCents > cash ? receivedCents - cash : null,
      detail: reminder || (prepaid > 0 ? `${formatEuros(prepaid)} sur la carte ${label}` : '')
    });
    // Le rappel doit être lu : l'écran ne s'efface pas seul.
    if (reminder) clearTimeout(doneTimer);
  }

  function payCash(receivedCents: number | null) {
    const received = receivedCents ?? parseEuros(amountInput);
    if (received === null || received < split.cashCents) {
      error = `Indiquez au moins ${formatEuros(split.cashCents)} reçus.`;
      return;
    }
    run(() => confirmSale(received));
  }

  async function pollOrders() {
    if (document.visibilityState !== 'visible' || !current || screen === 'orders') return;
    orders = await callApi<PendingOrder[]>('orders').catch(() => orders);
  }

  function selectTab(tab: 'sell' | 'orders' | 'sales') {
    error = '';
    // Le panier reste, mais un paiement commencé s'arrête : son scan ne vaut que pour lui.
    if (payingOrder) resetSale();
    prepaidCard = null;
    selectedSale = null;
    selectedOrder = null;
    if (tab === 'sell') screen = current ? 'sell' : 'closed';
    if (tab === 'orders') openOrders();
    if (tab === 'sales') openSales();
  }

  function openOrders() {
    run(async () => {
      orderSearch = '';
      orders = await callApi<PendingOrder[]>('orders');
      screen = 'orders';
    });
  }

  function searchOrders() {
    run(async () => {
      const query = orderSearch.trim() ? `?search=${encodeURIComponent(orderSearch.trim())}` : '';
      orders = await callApi<PendingOrder[]>(`orders${query}`);
    });
  }

  function showOrder(id: number) {
    return run(async () => {
      selectedOrder = await callApi<PendingOrder>(`orders/${id}`);
      screen = 'order';
    });
  }

  /** La commande passe en paiement : le reste du parcours est celui d'une vente. */
  function collectOrder(order: PendingOrder) {
    resetSale();
    payingOrder = order;
    prepaidCard = { scanToken: '', label: order.label, balanceCents: order.availableCents };
    go('pay');
  }

  function launchSumUp(foreignTxId: string, amountCents: number) {
    location.href = sumUpLink({ affiliateKey, amountCents, foreignTxId, origin: location.origin, isIos: isIosDevice() });
  }

  function payByCard() {
    run(async () => {
      const { attempt } = await callApi('sales', salePayload({ payRestByCard: true }));
      resetSale();
      await reload();
      launchSumUp(attempt.foreignTxId, attempt.amountCents);
    });
  }

  function verifyCard() {
    const id = pendingSale?.foreignTxId;
    if (!id) return Promise.resolve();
    // Relevé maintenant : la vente quitte la liste des ventes en attente dès qu'elle est réglée.
    const prepaidCents = pendingSale?.prepaidCents ?? 0;
    return run(async () => {
      const state = await callApi('card-attempts/verify', { foreignTxId: id });
      await refresh();
      if (state.saleStatus === 'paid') {
        lastSale = { id: state.saleId, cashCents: 0, cardCents: state.amountCents, prepaidCents };
        showDone({ title: 'Paiement CB confirmé', amountCents: state.amountCents, changeCents: null, detail: '' });
        return;
      }
      if (state.anomaly === 'amount') error = 'SumUp a encaissé un autre montant : remboursez-le dans SumUp, puis abandonnez la vente.';
      else if (state.attemptStatus === 'failed' || state.attemptStatus === 'expired') error = 'Paiement non abouti.';
      else error = 'Paiement pas encore confirmé par SumUp : réessayez dans un instant.';
    });
  }

  function retryCard() {
    const sale = pendingSale;
    if (!sale) return;
    run(async () => {
      const attempt = await callApi(`sales/${sale.saleId}/card-attempts`, {});
      await refresh();
      launchSumUp(attempt.foreignTxId, attempt.amountCents);
    });
  }

  function abandonCard() {
    const sale = pendingSale;
    if (!sale) return;
    run(async () => {
      await callApi(`sales/${sale.saleId}/abandon`, {});
      await reload();
    });
  }

  function openSales() {
    run(async () => {
      sales = await callApi<(SessionSale | SessionCardRefund)[]>('sessions/current/sales');
      screen = 'sales';
    });
  }

  /** Ce que le remboursement va faire : affiché avant, pour que le bénévole confirme en connaissance. */
  function refundPlan(sale: SessionSale) {
    return {
      toCardCents: sale.prepaidCardDeleted ? 0 : sale.prepaidCents,
      toCashCents: sale.cashCents + (sale.prepaidCardDeleted ? sale.prepaidCents : 0),
      toSumUpCents: sale.cardCents
    };
  }

  async function refundCardPayment(attemptId: number): Promise<CardRefund | null> {
    try {
      return await callApi<CardRefund>(`card-attempts/${attemptId}/refund`, {});
    } catch {
      return null;
    }
  }

  /** Un paiement arrivé sur une vente qui ne l'attendait plus : remboursé d'un appui. */
  function refundStray(attemptId: number) {
    run(async () => {
      const refund = await callApi<CardRefund>(`card-attempts/${attemptId}/refund`, {});
      if (refund.status === 'failed') error = `SumUp a refusé : ${refund.error ?? 'remboursez dans l\'application SumUp'}.`;
      else if (refund.status === 'pending') error = 'Remboursement demandé à SumUp, pas encore confirmé : ne le relancez pas, la caisse le revérifie.';
      await refresh();
    });
  }

  function refundSale(sale: SessionSale) {
    run(async () => {
      const result = await callApi(`sales/${sale.id}/cancel`, {});
      if (lastSale?.id === sale.id) lastSale = null;
      selectedSale = null;
      await refresh();
      // La part CB repart par l'API SumUp ; si elle échoue, la caisse dit de la faire dans l'application.
      const sumUp = result.cardAttemptId ? await refundCardPayment(result.cardAttemptId) : null;
      handover = { cashCents: result.cashToReturnCents, cardCents: result.cardCreditedCents, sumUpCents: result.sumUpToRefundCents, sumUp };
      screen = 'handover';
    });
  }

  function finishHandover() {
    handover = null;
    newSale();
  }

  /** Depuis l'écran de fin : même confirmation que depuis la liste des ventes. */
  function reviewLastSale() {
    const id = lastSale?.id;
    if (!id) return;
    run(async () => {
      sales = await callApi<(SessionSale | SessionCardRefund)[]>('sessions/current/sales');
      selectedSale = sales.find((s): s is SessionSale => s.kind === 'sale' && s.id === id) ?? null;
      clearTimeout(doneTimer);
      done = null;
      screen = selectedSale ? 'saleConfirm' : 'sales';
    });
  }

  function confirmRefund() {
    run(async () => {
      const data = await callApi('cards/refund', { clientId: refundClientId, scanToken: refundTarget!.scanToken });
      refundTarget = null;
      refundClientId = newClientId();
      await refresh();
      handover = { cashCents: data.cashCents, cardCents: 0, sumUpCents: 0, cbBack: data.cardRefunds, cashNotes: data.cashFallbacks };
      screen = 'handover';
    });
  }
</script>

{#snippet back(label: string, target: Screen, onback?: () => void)}
  <button type="button" class="text-muted-foreground -ml-1 flex min-h-11 items-center gap-1 text-sm" onclick={() => { onback?.(); go(target); }}>
    <ChevronLeft class="size-5" />{label}
  </button>
{/snippet}

<!-- Le même en-tête que l'espace adhérent : mêmes hauteur, logo et typographie. -->
<header
  class="bg-background sticky top-0 z-40 border-b"
  style="height: calc(3.5rem + env(safe-area-inset-top, 0px)); padding-top: env(safe-area-inset-top, 0px)"
>
  <div class="mx-auto flex h-full max-w-md items-center justify-between px-4">
    <div class="flex items-center gap-2">
      <img src="/logo.png" alt="" class="size-7 shrink-0 object-contain" />
      <div>
        <span class="text-foreground block text-sm font-bold tracking-tight">{clubName || 'Buvette'}</span>
        <span class="text-muted-foreground -mt-0.5 block text-[10px] font-semibold tracking-wider uppercase">Caisse</span>
      </div>
    </div>
  </div>
</header>

<div
  class="mx-auto flex max-w-md flex-col"
  style={`min-height: calc(100dvh - 3.5rem); padding-bottom: ${showNav ? 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' : '0px'}`}
>
  {#if error}
    <p role="alert" class="bg-destructive/10 text-destructive m-3 mb-0 rounded-lg p-3 text-sm">{error}</p>
  {/if}
  {#if current?.toRefund?.length && screen === 'sell'}
    <section role="alert" class="bg-destructive/10 text-destructive m-3 mb-0 space-y-2 rounded-lg p-3 text-sm">
      <p class="font-semibold">CB à rendre au client : SumUp ne l'a pas encore remboursée. Touchez le bouton ; ne la rendez pas en espèces.</p>
      {#each current.toRefund as r (r.attemptId)}
        <div class="flex items-center justify-between gap-2">
          <span class="tabular-nums">{formatEuros(r.amountCents)}{r.transactionCode ? ` · ${r.transactionCode}` : ''} · {r.kind === 'card_balance' ? 'solde de carte' : 'vente terminée'}</span>
          {#if r.refundStatus === 'pending'}
            <span class="text-xs">Remboursement en cours…</span>
          {:else}
            <Button size="sm" variant="outline" disabled={busy} onclick={() => refundStray(r.attemptId)}>{r.refundStatus === 'failed' ? 'Réessayer' : 'Rembourser'}</Button>
          {/if}
        </div>
      {/each}
    </section>
  {/if}

  {#if screen === 'loading'}
    <p class="text-muted-foreground p-4">Chargement…</p>

  {:else if screen === 'closed'}
    <main class="flex grow flex-col justify-center gap-4 p-4 text-center">
      <h1 class="text-2xl font-semibold">La caisse est fermée</h1>
      <p class="text-muted-foreground">Le bureau l'ouvre depuis l'administration, avant le service.</p>
      <Button size="lg" class="w-full" disabled={busy} onclick={() => run(reload)}>Actualiser</Button>
    </main>

  {:else if screen === 'scan'}
    <main class="p-4">
      <QrScanner
        title={scanPurpose === 'recharge' ? 'Carte à recharger' : scanPurpose === 'refund' ? 'Carte à rembourser' : scanPurpose === 'order' ? 'QR du client' : 'Carte du client'}
        {onScan}
        onCancel={cancelScan}
      />
    </main>

  {:else if screen === 'sell'}
    <main class="grid grow auto-rows-min grid-cols-3 gap-2 p-3" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 13rem)">
      {#each activeItems as item (item.id)}
        {@const quantity = cart.get(item.id) ?? 0}
        <button
          type="button"
          class="bg-card active:bg-muted relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left"
          onclick={() => add(item.id, 1)}
        >
          <!-- Le pictogramme en filigrane : on reconnaît l'article d'un coup d'œil, le nom reste lisible. -->
          <span class="text-primary/15 pointer-events-none absolute -right-2 -bottom-2 size-16 text-5xl"><ItemIcon name={item.name} icon={item.icon} class="size-16" /></span>
          <span class="relative line-clamp-3 text-sm leading-tight font-semibold">{item.name}</span>
          <span class="text-muted-foreground relative text-sm tabular-nums">{formatEuros(item.priceCents)}</span>
          {#if quantity > 0}
            <span class="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-xs font-bold">{quantity}</span>
          {/if}
        </button>
      {/each}
      <button type="button" class="active:bg-muted flex aspect-square flex-col justify-between rounded-2xl border border-dashed p-3 text-left" onclick={() => go('recharge')}>
        <Plus class="size-5" />
        <span class="text-sm leading-tight font-semibold">Recharge carte</span>
      </button>
      <button type="button" class="active:bg-muted flex aspect-square flex-col justify-between rounded-2xl border border-dashed p-3 text-left" onclick={() => go('refund')}>
        <RotateCcw class="size-5" />
        <span class="text-sm leading-tight font-semibold">Rembourser une carte</span>
      </button>
      <button type="button" class="active:bg-muted flex aspect-square flex-col justify-between rounded-2xl border border-dashed p-3 text-left" onclick={() => startScan('order')}>
        <ScanLine class="size-5" />
        <span class="text-sm leading-tight font-semibold">Scanner une commande</span>
      </button>
      {#if activeItems.length === 0}
        <p class="text-muted-foreground col-span-3 text-sm">Aucun article en vente : le catalogue se règle dans l'administration.</p>
      {/if}
    </main>

    <div class="bg-background fixed inset-x-0 bottom-0 z-10 border-t" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 4.75rem)">
      <div class="mx-auto max-w-md space-y-2 p-3">
        {#if !cartEmpty}
          <button type="button" class="flex min-h-10 w-full items-center gap-2 text-sm" onclick={() => go('cart')}>
            <ShoppingBasket class="size-5" />
            <span class="grow text-left">{articleCount} article{articleCount > 1 ? 's' : ''} · voir le panier</span>
          </button>
        {/if}
        <Button size="lg" class="h-14 w-full text-lg" disabled={cartEmpty} onclick={() => go('pay')}>
          {cartEmpty ? 'Choisissez un article' : `Encaisser ${formatEuros(totalCents)}`}
        </Button>
      </div>
    </div>

  {:else if screen === 'cart'}
    <main class="grow space-y-3 p-4 pb-24">
      {@render back('Articles', 'sell')}
      <h1 class="text-2xl font-semibold">Panier</h1>
      <ul class="divide-y rounded-2xl border">
        {#each [...cart] as [id, quantity] (id)}
          {@const item = items.find((i) => i.id === id)}
          <li class="flex items-center gap-2 p-3">
            <span class="grow">
              <span class="block font-medium">{item?.name}</span>
              <span class="text-muted-foreground text-sm tabular-nums">{formatEuros((item?.priceCents ?? 0) * quantity)}</span>
            </span>
            <Button variant="outline" size="icon" aria-label="Retirer" onclick={() => add(id, -1)}>−</Button>
            <span class="w-6 text-center tabular-nums">{quantity}</span>
            <Button variant="outline" size="icon" aria-label="Ajouter" onclick={() => add(id, 1)}>+</Button>
          </li>
        {/each}
        {#if rechargeCents > 0}
          <li class="flex items-center gap-2 p-3">
            <span class="grow">
              <span class="block font-medium">Recharge {formatEuros(rechargeCents)}</span>
              <span class="text-muted-foreground text-sm">{rechargeCard?.label}</span>
            </span>
            <Button variant="outline" size="sm" onclick={() => { rechargeCents = 0; rechargeCard = null; if (cart.size === 0) screen = 'sell'; }}>Retirer</Button>
          </li>
        {/if}
      </ul>
      <Button variant="ghost" class="w-full" onclick={() => { resetSale(); go('sell'); }}>Vider le panier</Button>
    </main>
    <div class="bg-background fixed inset-x-0 bottom-0 z-10 border-t p-3" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 5.25rem)">
      <div class="mx-auto max-w-md">
        <Button size="lg" class="h-14 w-full text-lg" onclick={() => go('pay')}>Encaisser {formatEuros(totalCents)}</Button>
      </div>
    </div>

  {:else if screen === 'recharge'}
    <main class="grow space-y-4 p-4">
      {@render back('Articles', 'sell')}
      <h1 class="text-2xl font-semibold">Recharger une carte</h1>
      <Button variant="outline" size="lg" class="h-14 w-full" onclick={() => { pendingRechargeCents = 0; startScan('recharge'); }}>Vendre une carte papier</Button>
      <p class="text-muted-foreground text-sm">Ou choisissez un montant, puis scannez la carte du client.</p>
      <div class="grid grid-cols-2 gap-2">
        {#each RECHARGES as cents (cents)}
          <button type="button" class="bg-card active:bg-muted rounded-2xl border p-6 text-2xl font-semibold tabular-nums" onclick={() => chooseRecharge(cents)}>{cents / 100} €</button>
        {/each}
      </div>
    </main>

  {:else if screen === 'pay'}
    <main class="flex grow flex-col gap-4 p-4">
      {#if payingOrder}
        {@render back('Commande', 'order', () => { payingOrder = null; prepaidCard = null; })}
      {:else}
        {@render back('Panier', cartEmpty ? 'sell' : 'cart', () => (prepaidCard = null))}
      {/if}
      <div class="py-6 text-center">
        <p class="text-muted-foreground text-sm">{prepaidCard ? 'Reste à payer' : 'À payer'}</p>
        <p class="text-5xl font-semibold tabular-nums">{formatEuros(split.cashCents)}</p>
        {#if prepaidCard}
          <p class="text-muted-foreground mt-2 text-sm">{formatEuros(split.prepaidCents)} sur la carte {prepaidCard.label}</p>
        {/if}
      </div>
      {#if split.cashCents === 0}
        <Button size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={() => run(() => confirmSale(null))}>Valider la commande</Button>
      {/if}
      <div class="grid gap-2">
        {#if !prepaidCard && itemsCents > 0}
          <button type="button" class="bg-card active:bg-muted flex items-center gap-4 rounded-2xl border p-5 text-lg font-semibold" disabled={busy} onclick={() => startScan('prepaid')}>
            <QrCode class="size-7" />Carte buvette
          </button>
        {/if}
        {#if affiliateKey && split.cashCents > 0}
          <button type="button" class="bg-card active:bg-muted flex items-center gap-4 rounded-2xl border p-5 text-lg font-semibold" disabled={busy} onclick={payByCard}>
            <CreditCard class="size-7" />CB
          </button>
        {/if}
        {#if split.cashCents > 0}
          <button type="button" class="bg-card active:bg-muted flex items-center gap-4 rounded-2xl border p-5 text-lg font-semibold" disabled={busy} onclick={() => { amountInput = ''; go('cash'); }}>
            <Banknote class="size-7" />Espèces
          </button>
        {/if}
      </div>
    </main>

  {:else if screen === 'cash'}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Moyens de paiement', 'pay')}
      <div class="py-4 text-center">
        <p class="text-muted-foreground text-sm">Espèces à encaisser</p>
        <p class="text-5xl font-semibold tabular-nums">{formatEuros(split.cashCents)}</p>
      </div>
      <Button size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={() => payCash(split.cashCents)}>Montant exact</Button>
      <div class="grid grid-cols-3 gap-2">
        {#each suggestedNotes(split.cashCents) as note (note)}
          <button type="button" class="bg-card active:bg-muted rounded-2xl border p-4 text-lg font-semibold tabular-nums" disabled={busy} onclick={() => payCash(note)}>{note / 100} €</button>
        {/each}
      </div>
      <div class="flex items-end gap-2">
        <label class="block grow space-y-1">
          <span class="text-sm">Autre montant reçu (€)</span>
          <Input inputmode="decimal" bind:value={amountInput} placeholder="12,50" />
        </label>
        <Button variant="outline" disabled={busy || !amountInput} onclick={() => payCash(null)}>Valider</Button>
      </div>
    </main>

  {:else if screen === 'cb' && pendingSale}
    <main class="flex grow flex-col justify-center gap-3 p-4">
      <div class="py-4 text-center">
        <p class="text-muted-foreground text-sm">Paiement CB en attente</p>
        <p class="text-5xl font-semibold tabular-nums">{formatEuros(pendingSale.cardCents)}</p>
        {#if pendingSale.prepaidCents > 0}
          <p class="text-muted-foreground mt-2 text-sm">{formatEuros(pendingSale.prepaidCents)} réservés sur la carte</p>
        {/if}
      </div>
      {#if pendingSale.attemptStatus === 'pending' && pendingSale.foreignTxId}
        <Button size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={verifyCard}>Vérifier le paiement</Button>
        <Button variant="outline" class="w-full" onclick={() => launchSumUp(pendingSale.foreignTxId!, pendingSale.cardCents)}>Rouvrir SumUp</Button>
      {:else}
        <Button size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={retryCard}>Relancer le paiement CB</Button>
      {/if}
      <Button variant="ghost" class="w-full" disabled={busy} onclick={abandonCard}>Abandonner la vente</Button>
    </main>

  {:else if screen === 'done' && done}
    <main class="flex grow flex-col items-center justify-center gap-3 p-4 text-center">
      <span class="bg-primary text-primary-foreground flex size-20 items-center justify-center rounded-full"><Check class="size-10" /></span>
      <h1 class="text-xl font-semibold">{done.title}</h1>
      {#if done.amountCents > 0}<p class="text-3xl font-semibold tabular-nums">{formatEuros(done.amountCents)}</p>{/if}
      {#if done.detail}<p class="text-muted-foreground text-sm">{done.detail}</p>{/if}
      {#if done.changeCents !== null && done.changeCents > 0}
        <div class="border-primary bg-primary/10 w-full rounded-2xl border-2 p-5">
          <p class="flex items-center justify-center gap-2 font-semibold"><Banknote class="size-5" />Rendez la monnaie en espèces</p>
          <p class="text-6xl font-semibold tabular-nums">{formatEuros(done.changeCents)}</p>
        </div>
      {:else}
        <div class="w-full rounded-2xl border-2 border-dashed p-4">
          <p class="flex items-center justify-center gap-2 font-semibold"><Banknote class="size-5" />{done.changeCents === 0 ? 'Pas de monnaie à rendre' : 'Rien à rendre en espèces'}</p>
        </div>
      {/if}
      <Button size="lg" class="mt-4 h-14 w-full text-lg" onclick={newSale}>Nouvelle vente</Button>
      {#if lastSale}
        <Button variant="ghost" class="w-full" disabled={busy} onclick={reviewLastSale}>Rembourser cette vente</Button>
      {/if}
    </main>

  {:else if screen === 'sales'}
    <main class="grow space-y-3 p-4" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6rem)">
      <h1 class="text-2xl font-semibold">Ventes</h1>
      {#if sales.length}
        <ul class="bg-card divide-y overflow-hidden rounded-2xl border">
          {#each sales as sale (`${sale.kind}-${sale.id}`)}
            {#if sale.kind === 'card_refund'}
              <li class="flex min-h-14 items-center gap-3 px-4 py-2">
                <span class="min-w-0 grow">
                  <span class="block truncate text-sm font-semibold">Remboursement de carte · {sale.cardLabel}</span>
                  <span class="text-muted-foreground block text-xs">{time(sale.createdAt)} · rendu en espèces</span>
                </span>
                <span class="shrink-0 text-sm font-medium tabular-nums">−{formatEuros(sale.amountCents)}</span>
                <span class="size-4 shrink-0"></span>
              </li>
            {:else}
            <li>
              <button type="button" class="active:bg-muted flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" onclick={() => { selectedSale = sale; go('sale'); }}>
                <span class="min-w-0 grow">
                  <span class="block truncate text-sm font-semibold">{saleTitle(sale)}</span>
                  <span class="text-muted-foreground block text-xs">{time(sale.createdAt)} · {saleStatus(sale)}{sale.transactionCode ? ` · ${sale.transactionCode}` : ''}</span>
                </span>
                <span class={`shrink-0 text-sm font-medium tabular-nums ${sale.status === 'cancelled' ? 'text-muted-foreground line-through' : ''}`}>{formatEuros(sale.itemsCents + sale.rechargeCents)}</span>
                <ChevronRight class="text-muted-foreground size-4 shrink-0" />
              </button>
            </li>
            {/if}
          {/each}
        </ul>
      {:else}
        <p class="text-muted-foreground text-sm">Aucune vente dans cette session.</p>
      {/if}
    </main>

  {:else if screen === 'sale' && selectedSale}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Ventes', 'sales', () => (selectedSale = null))}
      <div class="py-2 text-center">
        <p class="text-muted-foreground text-sm">{time(selectedSale.createdAt)} · {saleStatus(selectedSale)}</p>
        <p class="text-5xl font-semibold tabular-nums">{formatEuros(selectedSale.itemsCents + selectedSale.rechargeCents)}</p>
      </div>
      <ul class="bg-card divide-y rounded-2xl border text-sm">
        {#each selectedSale.lines as line (line.name)}
          <li class="flex justify-between gap-3 p-3"><span>{line.quantity} × {line.name}</span><span class="tabular-nums">{formatEuros(line.quantity * line.unitPriceCents)}</span></li>
        {/each}
        {#if selectedSale.rechargeCents > 0}
          <li class="flex justify-between gap-3 p-3"><span>Recharge de carte</span><span class="tabular-nums">{formatEuros(selectedSale.rechargeCents)}</span></li>
        {/if}
      </ul>
      <dl class="space-y-1 text-sm">
        {#if selectedSale.prepaidCents > 0}<div class="flex justify-between"><dt>Carte buvette</dt><dd class="tabular-nums">{formatEuros(selectedSale.prepaidCents)}</dd></div>{/if}
        {#if selectedSale.cashCents > 0}<div class="flex justify-between"><dt>Espèces</dt><dd class="tabular-nums">{formatEuros(selectedSale.cashCents)}</dd></div>{/if}
        {#if selectedSale.cardCents > 0}<div class="flex justify-between"><dt>CB</dt><dd class="tabular-nums">{formatEuros(selectedSale.cardCents)}</dd></div>{/if}
        {#if selectedSale.transactionCode}<div class="flex justify-between"><dt>Transaction SumUp</dt><dd class="font-mono">{selectedSale.transactionCode}</dd></div>{/if}
        {#if selectedSale.cardRefundStatus}
          <div class="flex justify-between"><dt>Remboursement CB</dt><dd>{selectedSale.cardRefundStatus === 'done' ? 'fait par SumUp' : selectedSale.cardRefundStatus === 'pending' ? 'en cours' : 'refusé par SumUp'}</dd></div>
        {/if}
      </dl>
      {#if selectedSale.status === 'cancelled' && selectedSale.cardAttemptId && selectedSale.cardRefundStatus !== 'done' && selectedSale.cardRefundStatus !== 'pending'}
        <Button variant="outline" size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={() => refundStray(selectedSale!.cardAttemptId!)}>Rembourser la CB par SumUp</Button>
      {/if}
      {#if selectedSale.status === 'paid'}
        {#if selectedSale.rechargeCents > 0}
          <p class="text-muted-foreground text-sm">Le remboursement retire la recharge de la carte. Il est refusé si elle a déjà été dépensée.</p>
        {/if}
        <Button variant="outline" size="lg" class="h-14 w-full text-lg" onclick={() => go('saleConfirm')}>Rembourser cette vente</Button>
      {/if}
    </main>

  {:else if screen === 'saleConfirm' && selectedSale}
    {@const plan = refundPlan(selectedSale)}
    <main class="flex grow flex-col gap-4 p-4">
      <h1 class="text-2xl font-semibold">Rembourser cette vente ?</h1>
      <p class="text-muted-foreground text-sm">{saleTitle(selectedSale)}</p>
      <MoneyHandover
        phase="before"
        cashCents={plan.toCashCents}
        sumUp={plan.toSumUpCents > 0 ? [{ amountCents: plan.toSumUpCents, state: 'planned' }] : []}
        cardCents={plan.toCardCents}
        cardLabel={selectedSale.prepaidCardLabel ?? ''}
      />
      {#if selectedSale.rechargeCents > 0}
        <p class="bg-card rounded-2xl border p-4 text-sm">La recharge de {formatEuros(selectedSale.rechargeCents)} est retirée de la carte.</p>
      {/if}
      {#if selectedSale.prepaidCardDeleted}
        <p class="text-muted-foreground text-sm">Le client a supprimé sa carte : ce qu'elle avait payé lui est rendu en espèces.</p>
      {/if}
      <p class="text-muted-foreground text-sm">Cette action ne s'annule pas.</p>
      <Button variant="destructive" size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={() => refundSale(selectedSale!)}>
        Rembourser {formatEuros(selectedSale.itemsCents + selectedSale.rechargeCents)}
      </Button>
      <Button variant="ghost" class="w-full" disabled={busy} onclick={() => go('sale')}>Retour</Button>
    </main>

  {:else if screen === 'handover' && handover}
    {@const sumUpParts = [
      ...(handover.sumUpCents > 0 ? [{ amountCents: handover.sumUp?.amountCents || handover.sumUpCents, state: (handover.sumUp?.status ?? 'failed') as 'done' | 'pending' | 'failed' }] : []),
      ...(handover.cbBack ?? []).map((back) => ({ amountCents: back.amountCents, state: back.status }))
    ]}
    {@const sumUpFailed = sumUpParts.some((part) => part.state === 'failed')}
    <main class="flex grow flex-col justify-center gap-4 p-4">
      <h1 class="text-center text-xl font-semibold">Remboursement enregistré</h1>
      <MoneyHandover phase="after" cashCents={handover.cashCents} sumUp={sumUpParts} cardCents={handover.cardCents} cashNotes={handover.cashNotes ?? []} />
      <Button size="lg" class="mt-2 h-14 w-full text-lg" onclick={finishHandover}>
        {handover.cashCents > 0 ? `J'ai remis ${formatEuros(handover.cashCents)} en espèces` : sumUpFailed ? "J'ai remboursé dans l'application SumUp" : 'Terminé : rien à remettre'}
      </Button>
    </main>

  {:else if screen === 'orders'}
    <main class="grow space-y-3 p-4" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6rem)">
      <h1 class="text-2xl font-semibold">Commandes</h1>
      <Button size="lg" class="h-14 w-full text-lg" onclick={() => startScan('order')}><ScanLine class="size-5" />Scanner le QR du client</Button>
      <form class="flex gap-2" onsubmit={(event) => { event.preventDefault(); searchOrders(); }}>
        <Input bind:value={orderSearch} placeholder="Numéro ou adresse e-mail" autocapitalize="off" aria-label="Rechercher une commande" />
        <Button type="submit" variant="outline" disabled={busy}>Chercher</Button>
      </form>
      {#if orders.length}
        <ul class="bg-card divide-y overflow-hidden rounded-2xl border">
          {#each orders as order (order.id)}
            <li>
              <button type="button" class="active:bg-muted flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" onclick={() => showOrder(order.id)}>
                <span class="min-w-0 grow">
                  <span class="block truncate text-sm font-semibold">N° {order.number} · {order.label}</span>
                  <span class="text-muted-foreground block truncate text-xs">{time(order.createdAt)} · {order.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ')}</span>
                </span>
                <span class="shrink-0 text-sm font-medium tabular-nums">{formatEuros(order.totalCents)}</span>
                <ChevronRight class="text-muted-foreground size-4 shrink-0" />
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="text-muted-foreground text-sm">{orderSearch ? 'Aucune commande ne correspond.' : 'Aucune commande en cours.'}</p>
      {/if}
    </main>

  {:else if screen === 'order' && selectedOrder}
    {@const unavailable = selectedOrder.lines.some((l) => !l.available)}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Commandes', 'orders')}
      <div class="py-2 text-center">
        <p class="text-muted-foreground text-sm">Commande n° {selectedOrder.number} · {selectedOrder.label}</p>
        <p class="text-5xl font-semibold tabular-nums">{formatEuros(selectedOrder.totalCents)}</p>
        <p class="text-muted-foreground mt-2 text-sm">Disponible sur la carte : {formatEuros(selectedOrder.availableCents)}</p>
      </div>
      <ul class="bg-card divide-y rounded-2xl border text-sm">
        {#each selectedOrder.lines as line (line.name)}
          <li class="flex justify-between gap-3 p-3">
            <span>{line.quantity} × {line.name}{#if !line.available}<span class="text-destructive"> · plus en vente</span>{/if}</span>
            <span class="tabular-nums">{formatEuros(line.quantity * line.unitPriceCents)}</span>
          </li>
        {/each}
      </ul>
      {#if unavailable}
        <p role="alert" class="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">Un article n'est plus en vente : le client doit modifier sa commande.</p>
      {/if}
      <Button size="lg" class="h-14 w-full text-lg" disabled={busy || unavailable} onclick={() => collectOrder(selectedOrder!)}>Encaisser la commande</Button>
    </main>

  {:else if screen === 'refund'}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Articles', 'sell', () => (refundTarget = null))}
      <h1 class="text-2xl font-semibold">Rembourser une carte</h1>
      {#if refundTarget}
        <div class="py-4 text-center">
          <p class="text-muted-foreground text-sm">Carte {refundTarget.label}</p>
          <p class="text-5xl font-semibold tabular-nums">{formatEuros(refundTarget.balanceCents)}</p>
        </div>
        {#if refundTarget.kind === 'paper'}
          <p class="bg-primary/10 border-primary rounded-2xl border p-3 text-sm font-semibold">Reprenez la carte papier. Une fois remboursée, elle ne vaudra plus rien.</p>
        {:else}
          <p class="text-muted-foreground text-sm">La carte reste ouverte, à 0 €.</p>
        {/if}
        <MoneyHandover
          phase="before"
          cashCents={refundTarget.balanceCents - (refundTarget.cbRefundableCents ?? 0)}
          sumUp={(refundTarget.cbRefundableCents ?? 0) > 0 ? [{ amountCents: refundTarget.cbRefundableCents!, state: 'planned' }] : []}
        />
        {#if (refundTarget.cbRefundableCents ?? 0) > 0}
          <p class="text-muted-foreground text-xs">La part SumUp revient sur la carte bancaire qui avait payé la recharge. Si SumUp la refuse, la caisse vous la fera rendre en espèces, en le disant clairement.</p>
        {/if}
        <Button size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={confirmRefund}>Confirmer le remboursement</Button>
      {:else}
        <Button size="lg" class="h-14 w-full text-lg" onclick={() => startScan('refund')}>Scanner la carte du client</Button>
      {/if}
    </main>

  {/if}
</div>

{#if showNav}
  <CaisseNav active={activeTab} ordersCount={orders.length} onSelect={selectTab} />
{/if}
