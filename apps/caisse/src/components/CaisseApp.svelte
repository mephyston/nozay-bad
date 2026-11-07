<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Banknote, Check, ChevronLeft, CreditCard, Ellipsis, Plus, QrCode, ShoppingBasket } from '@lucide/svelte';
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

  interface ScannedCard {
    scanToken: string;
    label: string;
    balanceCents: number;
  }

  type Screen = 'loading' | 'open' | 'sell' | 'cart' | 'recharge' | 'scan' | 'pay' | 'cash' | 'cb' | 'done' | 'menu' | 'refund' | 'close' | 'closed';
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
  let lastSale = $state<{ id: number; cardCents: number } | null>(null);
  let closing = $state<any>(null);
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
    screen = !session ? 'open' : session.inProgress.length ? 'cb' : 'sell';
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
    screen = current ? 'sell' : 'open';
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

  function openSession() {
    const openingFloatCents = parseEuros(amountInput);
    if (openingFloatCents === null) return (error = 'Saisissez le montant compté, par exemple 50 ou 50,00.');
    run(async () => {
      await callApi('sessions', { openingFloatCents });
      amountInput = '';
      await reload();
    });
  }

  /** `receivedCents` : ce que le bénévole confirme avoir reçu. Le serveur encaisse le reste en espèces. */
  async function confirmSale(receivedCents: number | null) {
    const cash = split.cashCents;
    const prepaid = split.prepaidCents;
    const { sale } = await callApi('sales', salePayload({}));
    lastSale = { id: sale.id, cardCents: sale.cardCents };
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
    return run(async () => {
      const state = await callApi('card-attempts/verify', { foreignTxId: id });
      await refresh();
      if (state.saleStatus === 'paid') {
        lastSale = { id: state.saleId, cardCents: state.amountCents };
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

  function cancelLastSale() {
    const sale = lastSale;
    if (!sale) return;
    run(async () => {
      await callApi(`sales/${sale.id}/cancel`, {});
      lastSale = null;
      await refresh();
      clearTimeout(doneTimer);
      showDone({
        title: 'Vente annulée',
        amountCents: 0,
        changeCents: null,
        detail: sale.cardCents > 0 ? `Remboursez ${formatEuros(sale.cardCents)} dans SumUp.` : 'Rendez les espèces au client si besoin.'
      });
      clearTimeout(doneTimer);
    });
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

  function closeSession() {
    const countedCashCents = parseEuros(amountInput);
    if (countedCashCents === null) return (error = 'Saisissez le montant compté.');
    run(async () => {
      closing = await callApi(`sessions/${current!.session.id}/close`, { countedCashCents });
      amountInput = '';
      lastSale = null;
      current = null;
      screen = 'closed';
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
      <button type="button" aria-label="Menu" class="flex size-11 items-center justify-center" onclick={() => go('menu')}><Ellipsis class="size-6" /></button>
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

  {:else if screen === 'open'}
    <main class="flex grow flex-col justify-center gap-4 p-4">
      <h1 class="text-2xl font-semibold">Ouvrir la caisse</h1>
      <label class="block space-y-1">
        <span class="text-sm">Fond de caisse compté (€)</span>
        <Input inputmode="decimal" bind:value={amountInput} placeholder="50,00" />
      </label>
      <Button size="lg" class="w-full" disabled={busy} onclick={openSession}>Ouvrir la session</Button>
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
      {#if lastSale && done.title !== 'Vente annulée' && done.title !== 'Solde remboursé'}
        <Button variant="ghost" class="w-full" disabled={busy} onclick={cancelLastSale}>Annuler cette vente</Button>
      {/if}
    </main>

  {:else if screen === 'menu'}
    <main class="grow space-y-4 p-4">
      {@render back('Articles', 'sell')}
      <h1 class="text-2xl font-semibold">Session de caisse</h1>
      <dl class="bg-card space-y-2 rounded-2xl border p-4">
        <div class="flex justify-between"><dt>Espèces attendues</dt><dd class="font-semibold tabular-nums">{formatEuros(current?.expectedCashCents ?? 0)}</dd></div>
        <div class="flex justify-between"><dt>CB</dt><dd class="font-semibold tabular-nums">{formatEuros(current?.cardCents ?? 0)}</dd></div>
        <div class="flex justify-between"><dt>Ventes</dt><dd class="font-semibold tabular-nums">{current?.salesCount ?? 0}</dd></div>
      </dl>
      {#if lastSale}
        <Button variant="outline" class="w-full" disabled={busy} onclick={cancelLastSale}>Annuler la dernière vente</Button>
      {/if}
      <Button variant="outline" class="w-full" onclick={() => go('refund')}>Rembourser une carte</Button>
      <Button variant="outline" class="w-full" onclick={() => { amountInput = ''; go('close'); }}>Clôturer la caisse</Button>
    </main>

  {:else if screen === 'refund'}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Menu', 'menu', () => (refundTarget = null))}
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

  {:else if screen === 'close'}
    <main class="flex grow flex-col gap-4 p-4">
      {@render back('Menu', 'menu')}
      <h1 class="text-2xl font-semibold">Clôturer la caisse</h1>
      <p>Espèces attendues : <strong class="tabular-nums">{formatEuros(current?.expectedCashCents ?? 0)}</strong></p>
      <label class="block space-y-1">
        <span class="text-sm">Espèces comptées (€)</span>
        <Input inputmode="decimal" bind:value={amountInput} placeholder="0,00" />
      </label>
      <Button size="lg" class="h-14 w-full text-lg" disabled={busy} onclick={closeSession}>Clôturer et enregistrer en comptabilité</Button>
    </main>

  {:else if screen === 'closed' && closing}
    <main class="grow space-y-4 p-4">
      <h1 class="text-2xl font-semibold">Caisse clôturée</h1>
      <dl class="bg-card space-y-2 rounded-2xl border p-4">
        <div class="flex justify-between"><dt>Espèces attendues</dt><dd class="tabular-nums">{formatEuros(closing.expectedCashCents)}</dd></div>
        <div class="flex justify-between"><dt>Espèces comptées</dt><dd class="tabular-nums">{formatEuros(closing.countedCashCents)}</dd></div>
        <div class="flex justify-between font-semibold"><dt>Écart</dt><dd class="tabular-nums">{formatEuros(closing.gapCents)}</dd></div>
        <div class="flex justify-between"><dt>Articles en espèces</dt><dd class="tabular-nums">{formatEuros(closing.itemsCashCents)}</dd></div>
        <div class="flex justify-between"><dt>Articles en CB</dt><dd class="tabular-nums">{formatEuros(closing.itemsCardCents)}</dd></div>
        <div class="flex justify-between"><dt>Articles par carte</dt><dd class="tabular-nums">{formatEuros(closing.prepaidCents)}</dd></div>
        <div class="flex justify-between"><dt>Recharges en espèces</dt><dd class="tabular-nums">{formatEuros(closing.rechargeCashCents)}</dd></div>
        <div class="flex justify-between"><dt>Recharges en CB</dt><dd class="tabular-nums">{formatEuros(closing.rechargeCardCents)}</dd></div>
        <div class="flex justify-between"><dt>Remboursements</dt><dd class="tabular-nums">{formatEuros(closing.refundsCents)}</dd></div>
      </dl>
      <Button size="lg" class="w-full" onclick={() => { closing = null; run(reload); }}>Terminer</Button>
    </main>
  {/if}
</div>
