<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Banknote, Check, ChevronLeft, ChevronRight, CreditCard, Plus, QrCode, ReceiptText, RotateCcw, ShoppingBasket } from '@lucide/svelte';
  import { Button, Input } from '@nba/ui';
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
    id: number;
    status: 'in_progress' | 'paid' | 'cancelled';
    createdAt: string;
    itemsCents: number;
    rechargeCents: number;
    prepaidCents: number;
    cashCents: number;
    cardCents: number;
    lines: { name: string; quantity: number; unitPriceCents: number }[];
  }

  interface ScannedCard {
    scanToken: string;
    label: string;
    balanceCents: number;
  }

  type Screen = 'loading' | 'closed' | 'sell' | 'cart' | 'recharge' | 'scan' | 'pay' | 'cash' | 'cb' | 'done' | 'sales' | 'sale' | 'refund';
  type ScanPurpose = 'prepaid' | 'recharge' | 'refund';

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
    toRefund: { transactionCode: string | null; amountCents: number }[];
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
  let sales = $state<SessionSale[]>([]);
  let selectedSale = $state<SessionSale | null>(null);
  let doneTimer: ReturnType<typeof setTimeout> | undefined;
  // Le même identifiant tant que la vente n'a pas abouti : un nouvel essai réseau n'encaisse qu'une fois.
  let saleClientId = newClientId();
  let refundClientId = newClientId();

  const activeItems = $derived(items.filter((i) => i.active));
  const itemsCents = $derived(itemsTotal(cart, items));
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
    return () => document.removeEventListener('visibilitychange', resume);
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
    amountInput = '';
    saleClientId = newClientId();
  }

  function salePayload(extra: Record<string, unknown>) {
    return {
      clientId: saleClientId,
      lines: [...cart].map(([itemId, quantity]) => ({ itemId, quantity })),
      ...(rechargeCents > 0 ? { rechargeCents, rechargeScanToken: rechargeCard?.scanToken } : {}),
      ...(prepaidCard ? { prepaidScanToken: prepaidCard.scanToken } : {}),
      expectedCashCents: split.cashCents,
      ...extra
    };
  }

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
    go(scanPurpose === 'refund' ? 'refund' : scanPurpose === 'recharge' ? 'recharge' : 'pay');
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
        if (purpose === 'refund') {
          refundTarget = card;
          screen = 'refund';
        } else if (purpose === 'recharge') {
          rechargeCard = card;
          rechargeCents = pendingRechargeCents;
          screen = 'sell';
        } else {
          prepaidCard = card;
          screen = 'pay';
          // La carte couvre tout : le scan vaut paiement, comme une carte sur un terminal.
          if (splitPayment(itemsCents, rechargeCents, card.balanceCents).cashCents === 0) await confirmSale(null);
        }
      } catch (e) {
        screen = purpose === 'refund' ? 'refund' : purpose === 'recharge' ? 'recharge' : 'pay';
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
    resetSale();
    await refresh();
    showDone({
      title: 'Paiement enregistré',
      amountCents: sale.itemsCents + sale.rechargeCents,
      changeCents: receivedCents !== null && receivedCents > cash ? receivedCents - cash : null,
      detail: prepaid > 0 ? `${formatEuros(prepaid)} sur la carte ${label}` : ''
    });
  }

  function payCash(receivedCents: number | null) {
    const received = receivedCents ?? parseEuros(amountInput);
    if (received === null || received < split.cashCents) {
      error = `Indiquez au moins ${formatEuros(split.cashCents)} reçus.`;
      return;
    }
    run(() => confirmSale(received));
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
      sales = await callApi<SessionSale[]>('sessions/current/sales');
      screen = 'sales';
    });
  }

  /** Rembourse une vente : la carte retrouve son dû, le reste se rend à la main ou dans SumUp. */
  function refundSale(sale: { id: number; cashCents: number; cardCents: number; prepaidCents: number }) {
    run(async () => {
      await callApi(`sales/${sale.id}/cancel`, {});
      if (lastSale?.id === sale.id) lastSale = null;
      selectedSale = null;
      await refresh();
      showDone({
        title: 'Vente remboursée',
        amountCents: 0,
        changeCents: sale.cashCents > 0 ? sale.cashCents : null,
        detail: [
          sale.prepaidCents > 0 ? `${formatEuros(sale.prepaidCents)} recrédités sur la carte.` : '',
          sale.cardCents > 0 ? `Remboursez ${formatEuros(sale.cardCents)} dans SumUp.` : ''
        ].filter(Boolean).join(' ')
      });
      // Rien ne s'efface seul : le bénévole doit lire ce qu'il lui reste à faire.
      clearTimeout(doneTimer);
    });
  }

  function cancelLastSale() {
    const sale = lastSale;
    if (sale) refundSale(sale);
  }

  function confirmRefund() {
    run(async () => {
      const data = await callApi('cards/refund', { clientId: refundClientId, scanToken: refundTarget!.scanToken });
      refundTarget = null;
      refundClientId = newClientId();
      await refresh();
      showDone({ title: 'Solde remboursé', amountCents: data.amountCents, changeCents: data.amountCents, detail: '' });
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
    {#if screen === 'sell'}
      <button type="button" aria-label="Transactions" class="flex size-11 items-center justify-center" disabled={busy} onclick={openSales}><ReceiptText class="size-6" /></button>
    {/if}
  </div>
</header>

<div class="mx-auto flex max-w-md flex-col" style="min-height: calc(100dvh - 3.5rem)">
  {#if error}
    <p role="alert" class="bg-destructive/10 text-destructive m-3 mb-0 rounded-lg p-3 text-sm">{error}</p>
  {/if}
  {#if current?.toRefund?.length && screen === 'sell'}
    <p role="alert" class="bg-destructive/10 text-destructive m-3 mb-0 rounded-lg p-3 text-sm">
      À rembourser dans SumUp :
      {current.toRefund.map((r) => `${formatEuros(r.amountCents)}${r.transactionCode ? ` (${r.transactionCode})` : ''}`).join(', ')}
    </p>
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
        title={scanPurpose === 'recharge' ? 'Carte à recharger' : scanPurpose === 'refund' ? 'Carte à rembourser' : 'Carte du client'}
        {onScan}
        onCancel={cancelScan}
      />
    </main>

  {:else if screen === 'sell'}
    <main class="grid grow auto-rows-min grid-cols-3 gap-2 p-3 pb-36">
      {#each activeItems as item (item.id)}
        {@const quantity = cart.get(item.id) ?? 0}
        <button
          type="button"
          class="bg-card active:bg-muted relative flex aspect-square flex-col justify-between rounded-2xl border p-3 text-left"
          onclick={() => add(item.id, 1)}
        >
          <span class="line-clamp-3 text-sm leading-tight font-semibold">{item.name}</span>
          <span class="text-muted-foreground text-sm tabular-nums">{formatEuros(item.priceCents)}</span>
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
      {#if activeItems.length === 0}
        <p class="text-muted-foreground col-span-3 text-sm">Aucun article en vente : le catalogue se règle dans l'administration.</p>
      {/if}
    </main>

    <div class="bg-background fixed inset-x-0 bottom-0 z-10 border-t" style="padding-bottom: env(safe-area-inset-bottom, 0px)">
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
    <main class="grow space-y-3 p-4 pb-28">
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
    <div class="bg-background fixed inset-x-0 bottom-0 border-t p-3" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem)">
      <div class="mx-auto max-w-md">
        <Button size="lg" class="h-14 w-full text-lg" onclick={() => go('pay')}>Encaisser {formatEuros(totalCents)}</Button>
      </div>
    </div>

  {:else if screen === 'recharge'}
    <main class="grow space-y-4 p-4">
      {@render back('Articles', 'sell')}
      <h1 class="text-2xl font-semibold">Recharger une carte</h1>
      <p class="text-muted-foreground text-sm">Choisissez le montant, puis scannez la carte du client.</p>
      <div class="grid grid-cols-2 gap-2">
        {#each RECHARGES as cents (cents)}
          <button type="button" class="bg-card active:bg-muted rounded-2xl border p-6 text-2xl font-semibold tabular-nums" onclick={() => chooseRecharge(cents)}>{cents / 100} €</button>
        {/each}
      </div>
    </main>

  {:else if screen === 'pay'}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Panier', cartEmpty ? 'sell' : 'cart', () => (prepaidCard = null))}
      <div class="py-6 text-center">
        <p class="text-muted-foreground text-sm">{prepaidCard ? 'Reste à payer' : 'À payer'}</p>
        <p class="text-5xl font-semibold tabular-nums">{formatEuros(split.cashCents)}</p>
        {#if prepaidCard}
          <p class="text-muted-foreground mt-2 text-sm">{formatEuros(split.prepaidCents)} sur la carte {prepaidCard.label}</p>
        {/if}
      </div>
      <div class="grid gap-2">
        {#if !prepaidCard && itemsCents > 0}
          <button type="button" class="bg-card active:bg-muted flex items-center gap-4 rounded-2xl border p-5 text-lg font-semibold" disabled={busy} onclick={() => startScan('prepaid')}>
            <QrCode class="size-7" />Carte buvette
          </button>
        {/if}
        {#if affiliateKey}
          <button type="button" class="bg-card active:bg-muted flex items-center gap-4 rounded-2xl border p-5 text-lg font-semibold" disabled={busy} onclick={payByCard}>
            <CreditCard class="size-7" />CB
          </button>
        {/if}
        <button type="button" class="bg-card active:bg-muted flex items-center gap-4 rounded-2xl border p-5 text-lg font-semibold" disabled={busy} onclick={() => { amountInput = ''; go('cash'); }}>
          <Banknote class="size-7" />Espèces
        </button>
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
      {#if done.changeCents !== null}
        <div class="bg-card w-full rounded-2xl border p-5">
          <p class="text-muted-foreground text-sm">À rendre</p>
          <p class="text-5xl font-semibold tabular-nums">{formatEuros(done.changeCents)}</p>
        </div>
      {/if}
      <Button size="lg" class="mt-4 h-14 w-full text-lg" onclick={newSale}>Nouvelle vente</Button>
      {#if lastSale && done.title !== 'Vente remboursée' && done.title !== 'Solde remboursé'}
        <Button variant="ghost" class="w-full" disabled={busy} onclick={cancelLastSale}>Rembourser cette vente</Button>
      {/if}
    </main>

  {:else if screen === 'sales'}
    <main class="grow space-y-3 p-4">
      {@render back('Articles', 'sell')}
      <h1 class="text-2xl font-semibold">Transactions</h1>
      {#if sales.length}
        <ul class="bg-card divide-y overflow-hidden rounded-2xl border">
          {#each sales as sale (sale.id)}
            <li>
              <button type="button" class="active:bg-muted flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" onclick={() => { selectedSale = sale; go('sale'); }}>
                <span class="min-w-0 grow">
                  <span class="block truncate text-sm font-semibold">{saleTitle(sale)}</span>
                  <span class="text-muted-foreground block text-xs">{time(sale.createdAt)} · {saleStatus(sale)}</span>
                </span>
                <span class={`shrink-0 text-sm font-medium tabular-nums ${sale.status === 'cancelled' ? 'text-muted-foreground line-through' : ''}`}>{formatEuros(sale.itemsCents + sale.rechargeCents)}</span>
                <ChevronRight class="text-muted-foreground size-4 shrink-0" />
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="text-muted-foreground text-sm">Aucune vente dans cette session.</p>
      {/if}
    </main>

  {:else if screen === 'sale' && selectedSale}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Transactions', 'sales', () => (selectedSale = null))}
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
      </dl>
      {#if selectedSale.status === 'paid'}
        {#if selectedSale.rechargeCents > 0}
          <p class="text-muted-foreground text-sm">Le remboursement retire la recharge de la carte. Il est refusé si elle a déjà été dépensée.</p>
        {/if}
        <Button variant="destructive" size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={() => refundSale(selectedSale!)}>Rembourser cette vente</Button>
      {/if}
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
        <p class="text-muted-foreground text-sm">Tout le solde est rendu en espèces. La carte reste ouverte, à 0 €.</p>
        <Button size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={confirmRefund}>Confirmer le remboursement</Button>
      {:else}
        <Button size="lg" class="h-14 w-full text-lg" onclick={() => startScan('refund')}>Scanner la carte du client</Button>
      {/if}
    </main>

  {/if}
</div>
