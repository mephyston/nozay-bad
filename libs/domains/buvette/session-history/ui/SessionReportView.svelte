<script lang="ts">
  import { Badge } from '@nba/ui';
  import ItemsReport from './ItemsReport.svelte';
  import { day, euros, time } from './format';

  /** Une session en détail : ses chiffres, chaque vente, les soldes rendus, les ventes par article. */
  let { report, categories = [] }: { report: any; categories?: { id: number; adminLabel: string }[] } = $props();

  const s = $derived(report.session);
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.adminLabel ?? `Catégorie n° ${id}`;
  const STATUS: Record<string, string> = { paid: 'Payée', cancelled: 'Remboursée', in_progress: 'Attend sa CB' };
  const payment = (sale: any) =>
    [sale.prepaidCents && `carte buvette ${euros(sale.prepaidCents)}`, sale.cashCents && `espèces ${euros(sale.cashCents)}`, sale.cardCents && `CB ${euros(sale.cardCents)}`]
      .filter(Boolean).join(' · ');
</script>

<div class="space-y-8">
  <a href="/admin/buvette/history" class="text-primary text-sm hover:underline">← Toutes les sessions</a>

  <section class="space-y-2">
    <h2 class="text-lg font-semibold first-letter:uppercase">{day(s.businessDate)}</h2>
    <dl class="grid max-w-2xl grid-cols-1 gap-x-8 gap-y-1 rounded-lg border p-4 text-sm sm:grid-cols-2">
      <div class="flex justify-between gap-4"><dt>Catégorie</dt><dd>{categoryName(s.accountingCategoryId)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Ouverte par</dt><dd>{s.openedByEmail}</dd></div>
      <div class="flex justify-between gap-4"><dt>Ventes payées</dt><dd class="tabular-nums">{s.salesCount}</dd></div>
      <div class="flex justify-between gap-4"><dt>Articles</dt><dd class="tabular-nums">{euros(s.itemsCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Recharges</dt><dd class="tabular-nums">{euros(s.rechargeCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Espèces</dt><dd class="tabular-nums">{euros(s.cashCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>CB</dt><dd class="tabular-nums">{euros(s.cardCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Carte buvette</dt><dd class="tabular-nums">{euros(s.prepaidCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Soldes rendus en espèces</dt><dd class="tabular-nums">{euros(s.refundsCashCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Soldes rendus sur CB</dt><dd class="tabular-nums">{euros(s.refundsCardCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Fond de caisse</dt><dd class="tabular-nums">{euros(s.openingFloatCents)}</dd></div>
      {#if s.status === 'closed'}
        <div class="flex justify-between gap-4"><dt>Espèces comptées</dt><dd class="tabular-nums">{euros(s.countedCashCents ?? 0)}</dd></div>
        <div class="flex justify-between gap-4 font-semibold"><dt>Écart</dt><dd class="tabular-nums">{euros(s.gapCents ?? 0)}</dd></div>
        <div class="flex justify-between gap-4"><dt>Clôturée par</dt><dd>{s.closedByEmail}</dd></div>
      {:else}
        <div class="flex justify-between gap-4"><dt>État</dt><dd><Badge>Ouverte</Badge></dd></div>
      {/if}
    </dl>
  </section>

  <section class="space-y-2">
    <h2 class="text-lg font-semibold">Ventes par article</h2>
    <div class="max-w-2xl"><ItemsReport items={report.items} /></div>
  </section>

  <section class="space-y-2">
    <h2 class="text-lg font-semibold">Ventes et transactions</h2>
    {#if report.sales.length || report.cardRefunds.length}
      <ul class="divide-y rounded-lg border text-sm">
        {#each report.cardRefunds as r (`r-${r.id}`)}
          <li class="flex flex-wrap items-center justify-between gap-2 p-3">
            <span><span class="tabular-nums">{time(r.createdAt)}</span> · Remboursement de solde de carte, {r.byCard ? 'sur CB' : 'en espèces'} · {r.createdByEmail}</span>
            <span class="tabular-nums font-medium">−{euros(r.amountCents)}</span>
          </li>
        {/each}
        {#each report.sales as sale (sale.id)}
          <li class="space-y-1 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span class="tabular-nums">{time(sale.createdAt)}</span> · Vente n° {sale.id}
                {#if sale.status !== 'paid'}<Badge variant={sale.status === 'cancelled' ? 'secondary' : 'outline'}>{STATUS[sale.status]}</Badge>{/if}
              </span>
              <span class={`tabular-nums font-medium ${sale.status === 'cancelled' ? 'text-muted-foreground line-through' : ''}`}>{euros(sale.itemsCents + sale.rechargeCents)}</span>
            </div>
            <p class="text-muted-foreground">
              {[...sale.lines.map((l: any) => `${l.quantity} × ${l.name}`), ...(sale.rechargeCents ? [`recharge ${euros(sale.rechargeCents)}`] : [])].join(', ')}
            </p>
            <p class="text-muted-foreground text-xs">{payment(sale)}{sale.transactionCode ? ` · SumUp ${sale.transactionCode}` : ''} · {sale.createdByEmail}</p>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-muted-foreground text-sm">Aucune vente dans cette session.</p>
    {/if}
  </section>
</div>
