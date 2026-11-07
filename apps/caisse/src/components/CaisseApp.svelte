<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Input } from '@nba/ui';
  import QrScanner from './QrScanner.svelte';
  import { callApi, changeDue, formatEuros, itemsTotal, parseEuros, splitPayment, type CatalogItem } from '../lib/cart';

  type Screen = 'loading' | 'open' | 'sell' | 'scan' | 'pay' | 'refund' | 'close' | 'closed';
  type ScanPurpose = 'prepaid' | 'recharge' | 'refund';
  interface ScannedCard { scanToken: string; label: string; balanceCents: number }

  const RECHARGES = [500, 1000, 2000, 5000];

  let screen = $state<Screen>('loading');
  let items = $state<CatalogItem[]>([]);
  let current = $state<{ session: { id: number }; expectedCashCents: number; salesCount: number } | null>(null);
  let cart = $state(new Map<number, number>());
  let rechargeCents = $state(0);
  let rechargeCard = $state<ScannedCard | null>(null);
  let prepaidCard = $state<ScannedCard | null>(null);
  let refundTarget = $state<ScannedCard | null>(null);
  let scanPurpose = $state<ScanPurpose>('prepaid');
  let received = $state('');
  let amountInput = $state('');
  let error = $state('');
  let busy = $state(false);
  let notice = $state('');
  let lastSaleId = $state<number | null>(null);
  let closing = $state<any>(null);
  // Garder le même identifiant tant que la vente n'a pas abouti : un nouvel essai réseau ne
  // peut ainsi pas encaisser deux fois.
  let saleClientId = crypto.randomUUID();
  let refundClientId = crypto.randomUUID();

  const activeItems = $derived(items.filter((i) => i.active));
  const itemsCents = $derived(itemsTotal(cart, items));
  const split = $derived(splitPayment(itemsCents, rechargeCents, prepaidCard?.balanceCents ?? null));
  const receivedCents = $derived(parseEuros(received));
  const change = $derived(changeDue(receivedCents, split.cashCents));
  const cartEmpty = $derived(cart.size === 0 && rechargeCents === 0);

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

  async function reload() {
    const [catalog, session] = await Promise.all([callApi<CatalogItem[]>('items'), callApi('sessions/current')]);
    items = catalog;
    current = session;
    screen = session ? 'sell' : 'open';
  }

  onMount(() => run(reload));

  function add(id: number, delta: number) {
    const next = new Map(cart);
    const quantity = (next.get(id) ?? 0) + delta;
    if (quantity > 0) next.set(id, quantity);
    else next.delete(id);
    cart = next;
  }

  function resetSale() {
    cart = new Map();
    rechargeCents = 0;
    rechargeCard = null;
    prepaidCard = null;
    received = '';
    saleClientId = crypto.randomUUID();
  }

  function startScan(purpose: ScanPurpose) {
    scanPurpose = purpose;
    error = '';
    screen = 'scan';
  }

  function onScan(qrToken: string) {
    run(async () => {
      try {
        const card = await callApi<ScannedCard>('cards/scan', { qrToken });
        if (scanPurpose === 'prepaid') prepaidCard = card;
        if (scanPurpose === 'recharge') rechargeCard = card;
        if (scanPurpose === 'refund') refundTarget = card;
      } finally {
        screen = scanPurpose === 'refund' ? 'refund' : scanPurpose === 'recharge' ? 'sell' : 'pay';
      }
    });
  }

  function setRecharge(cents: number) {
    rechargeCents = rechargeCents === cents ? 0 : cents;
    if (rechargeCents > 0 && !rechargeCard) startScan('recharge');
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

  function confirmSale() {
    run(async () => {
      const { sale } = await callApi('sales', {
        clientId: saleClientId,
        lines: [...cart].map(([itemId, quantity]) => ({ itemId, quantity })),
        ...(rechargeCents > 0 ? { rechargeCents, rechargeScanToken: rechargeCard?.scanToken } : {}),
        ...(prepaidCard ? { prepaidScanToken: prepaidCard.scanToken } : {}),
        expectedCashCents: split.cashCents
      });
      lastSaleId = sale.id;
      notice = `Vente enregistrée : ${formatEuros(sale.itemsCents + sale.rechargeCents)}.`;
      resetSale();
      await reload();
    });
  }

  function cancelLastSale() {
    run(async () => {
      await callApi(`sales/${lastSaleId}/cancel`, {});
      lastSaleId = null;
      notice = 'Dernière vente annulée.';
      await reload();
    });
  }

  function confirmRefund() {
    run(async () => {
      const data = await callApi('cards/refund', { clientId: refundClientId, scanToken: refundTarget!.scanToken });
      notice = `Rendez ${formatEuros(data.amountCents)} en espèces au client.`;
      refundTarget = null;
      refundClientId = crypto.randomUUID();
      await reload();
    });
  }

  function closeSession() {
    const countedCashCents = parseEuros(amountInput);
    if (countedCashCents === null) return (error = 'Saisissez le montant compté.');
    run(async () => {
      closing = await callApi(`sessions/${current!.session.id}/close`, { countedCashCents });
      amountInput = '';
      lastSaleId = null;
      screen = 'closed';
    });
  }
</script>

<main class="mx-auto max-w-md space-y-4 p-4">
  {#if error}
    <p role="alert" class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</p>
  {/if}
  {#if notice && screen === 'sell'}
    <p role="status" class="bg-muted rounded-md p-3 text-sm">{notice}</p>
  {/if}

  {#if screen === 'loading'}
    <p class="text-muted-foreground">Chargement…</p>
  {:else if screen === 'open'}
    <h1 class="text-xl font-semibold">Ouvrir la caisse</h1>
    <label class="block space-y-1">
      <span class="text-sm">Fond de caisse compté (€)</span>
      <Input inputmode="decimal" bind:value={amountInput} placeholder="50,00" />
    </label>
    <Button class="w-full" disabled={busy} onclick={openSession}>Ouvrir la session</Button>
  {:else if screen === 'scan'}
    <QrScanner
      title={scanPurpose === 'recharge' ? 'Carte à recharger' : scanPurpose === 'refund' ? 'Carte à rembourser' : 'Carte du client'}
      {onScan}
      onCancel={() => {
        if (scanPurpose === 'recharge' && !rechargeCard) rechargeCents = 0;
        screen = scanPurpose === 'refund' ? 'refund' : scanPurpose === 'recharge' ? 'sell' : 'pay';
      }}
    />
  {:else if screen === 'sell'}
    <div class="grid grid-cols-2 gap-2">
      {#each activeItems as item (item.id)}
        <button
          type="button"
          class="bg-card hover:bg-muted rounded-lg border p-3 text-left"
          onclick={() => add(item.id, 1)}
        >
          <span class="block font-medium">{item.name}</span>
          <span class="text-muted-foreground text-sm">{formatEuros(item.priceCents)}</span>
        </button>
      {:else}
        <p class="text-muted-foreground col-span-2">Aucun article en vente : le catalogue se règle dans l'administration.</p>
      {/each}
    </div>

    <section class="space-y-2">
      <h2 class="text-sm font-medium">Recharger une carte</h2>
      <div class="grid grid-cols-4 gap-2">
        {#each RECHARGES as cents (cents)}
          <Button variant={rechargeCents === cents ? 'default' : 'outline'} onclick={() => setRecharge(cents)}>{cents / 100} €</Button>
        {/each}
      </div>
      {#if rechargeCents > 0 && rechargeCard}
        <p class="text-muted-foreground text-sm">Carte {rechargeCard.label}, solde {formatEuros(rechargeCard.balanceCents)}</p>
      {/if}
    </section>

    {#if cart.size > 0}
      <ul class="divide-y rounded-lg border">
        {#each [...cart] as [id, quantity] (id)}
          {@const item = items.find((i) => i.id === id)}
          <li class="flex items-center justify-between gap-2 p-2">
            <span class="grow">{item?.name}</span>
            <Button variant="outline" size="sm" aria-label="Retirer" onclick={() => add(id, -1)}>−</Button>
            <span class="w-6 text-center">{quantity}</span>
            <Button variant="outline" size="sm" aria-label="Ajouter" onclick={() => add(id, 1)}>+</Button>
          </li>
        {/each}
      </ul>
    {/if}

    <p class="text-2xl font-semibold">Total {formatEuros(itemsCents + rechargeCents)}</p>
    <Button class="w-full" disabled={cartEmpty} onclick={() => { notice = ''; error = ''; screen = 'pay'; }}>Encaisser</Button>
    {#if !cartEmpty}
      <Button variant="ghost" class="w-full" onclick={resetSale}>Vider le panier</Button>
    {/if}

    <hr />
    <div class="grid grid-cols-2 gap-2">
      <Button variant="outline" onclick={() => { notice = ''; error = ''; screen = 'refund'; }}>Rembourser une carte</Button>
      <Button variant="outline" onclick={() => { notice = ''; error = ''; screen = 'close'; }}>Clôturer la caisse</Button>
    </div>
    {#if lastSaleId}
      <Button variant="ghost" class="w-full" disabled={busy} onclick={cancelLastSale}>Annuler la dernière vente</Button>
    {/if}
    <p class="text-muted-foreground text-sm">Espèces attendues : {formatEuros(current?.expectedCashCents ?? 0)} · {current?.salesCount ?? 0} vente(s)</p>
  {:else if screen === 'pay'}
    <h1 class="text-xl font-semibold">Encaisser {formatEuros(itemsCents + rechargeCents)}</h1>
    {#if prepaidCard}
      <p class="bg-muted rounded-md p-3 text-sm">
        Carte {prepaidCard.label}, solde {formatEuros(prepaidCard.balanceCents)}.<br />
        {formatEuros(split.prepaidCents)} seront débités.
      </p>
    {:else if itemsCents > 0}
      <Button variant="outline" class="w-full" onclick={() => startScan('prepaid')}>Scanner la carte buvette</Button>
    {/if}

    {#if split.cashCents > 0}
      <p class="text-lg font-medium">À encaisser en espèces : {formatEuros(split.cashCents)}</p>
      <label class="block space-y-1">
        <span class="text-sm">Reçu du client (€), pour calculer la monnaie</span>
        <Input inputmode="decimal" bind:value={received} placeholder="20,00" />
      </label>
      {#if change !== null}
        <p class="text-lg font-medium">À rendre : {formatEuros(change)}</p>
      {/if}
    {/if}

    <Button class="w-full" disabled={busy} onclick={confirmSale}>Valider la vente</Button>
    <Button variant="ghost" class="w-full" onclick={() => { prepaidCard = null; error = ''; screen = 'sell'; }}>Retour au panier</Button>
  {:else if screen === 'refund'}
    <h1 class="text-xl font-semibold">Rembourser une carte</h1>
    {#if refundTarget}
      <p>Carte {refundTarget.label}</p>
      <p class="text-2xl font-semibold">{formatEuros(refundTarget.balanceCents)}</p>
      <p class="text-muted-foreground text-sm">Tout le solde est rendu en espèces. La carte reste ouverte, à 0 €.</p>
      <Button class="w-full" disabled={busy} onclick={confirmRefund}>Confirmer le remboursement</Button>
    {:else}
      <Button class="w-full" onclick={() => startScan('refund')}>Scanner la carte du client</Button>
    {/if}
    <Button variant="ghost" class="w-full" onclick={() => { refundTarget = null; error = ''; screen = 'sell'; }}>Retour</Button>
  {:else if screen === 'close'}
    <h1 class="text-xl font-semibold">Clôturer la caisse</h1>
    <p>Espèces attendues : <strong>{formatEuros(current?.expectedCashCents ?? 0)}</strong></p>
    <label class="block space-y-1">
      <span class="text-sm">Espèces comptées (€)</span>
      <Input inputmode="decimal" bind:value={amountInput} placeholder="0,00" />
    </label>
    <Button class="w-full" disabled={busy} onclick={closeSession}>Clôturer et enregistrer en comptabilité</Button>
    <Button variant="ghost" class="w-full" onclick={() => { amountInput = ''; error = ''; screen = 'sell'; }}>Retour</Button>
  {:else if screen === 'closed' && closing}
    <h1 class="text-xl font-semibold">Caisse clôturée</h1>
    <dl class="space-y-1">
      <div class="flex justify-between"><dt>Espèces attendues</dt><dd>{formatEuros(closing.expectedCashCents)}</dd></div>
      <div class="flex justify-between"><dt>Espèces comptées</dt><dd>{formatEuros(closing.countedCashCents)}</dd></div>
      <div class="flex justify-between font-semibold"><dt>Écart</dt><dd>{formatEuros(closing.gapCents)}</dd></div>
      <div class="flex justify-between"><dt>Articles en espèces</dt><dd>{formatEuros(closing.itemsCashCents)}</dd></div>
      <div class="flex justify-between"><dt>Articles par carte</dt><dd>{formatEuros(closing.prepaidCents)}</dd></div>
      <div class="flex justify-between"><dt>Recharges</dt><dd>{formatEuros(closing.rechargeCashCents)}</dd></div>
      <div class="flex justify-between"><dt>Remboursements</dt><dd>{formatEuros(closing.refundsCents)}</dd></div>
    </dl>
    <Button class="w-full" onclick={() => { closing = null; notice = ''; run(reload); }}>Terminer</Button>
  {/if}
</main>
