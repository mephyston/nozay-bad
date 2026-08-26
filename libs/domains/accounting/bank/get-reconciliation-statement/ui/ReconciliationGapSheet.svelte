<script lang="ts">
  import { Amount, Sheet } from '@nba/ui';
  import type { ReconciliationStatementView } from './reconciliation-statement-types';

  /**
   * Le détail de l'écart, à la demande.
   *
   * Il vivait dans un `<details>` au fond de chaque encart : deux niveaux de repli à ouvrir, un par
   * compte, pour une information qu'on consulte rarement mais qu'on veut alors lire en entier. Un
   * panneau latéral la donne d'un clic, à pleine hauteur et défilable, sans quitter la file des yeux.
   */
  let {
    open = $bindable(false),
    statements = []
  }: {
    open?: boolean;
    statements: ReconciliationStatementView[];
  } = $props();

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  /* Groupé par compte : deux comptes, deux totaux, et l'on veut savoir lequel dérive. */
  const groups = $derived(
    statements
      .map((s) => ({
        account: s.account,
        asOfDate: s.asOfDate,
        totalCents: -s.unpointedEntriesTotalCents,
        rows: s.unpointedEntries.map((e) => ({
          id: e.id, date: e.date, label: e.description, cents: e.signedAmountCents
        }))
      }))
      .filter((g) => g.rows.length > 0)
  );

  const grandTotalCents = $derived(groups.reduce((sum, g) => sum + g.totalCents, 0));
  const count = $derived(groups.reduce((sum, g) => sum + g.rows.length, 0));
</script>

<Sheet.Root bind:open>
  <Sheet.Content size="lg" class="flex flex-col h-full overflow-hidden">
    <Sheet.Header class="p-6 border-b border-border">
      <Sheet.Title>Dans les livres, pas encore en banque</Sheet.Title>
      <Sheet.Description>
        Écritures comptabilisées qu'aucune ligne de relevé ne pointe encore. Elles expliquent
        l'écart entre le solde des livres et celui de la banque. L'autre moitié de l'écart — les
        lignes que les livres ignorent — est la file elle-même.
      </Sheet.Description>
    </Sheet.Header>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      {#if groups.length === 0}
        <p class="text-sm text-muted-foreground italic text-center py-8">
          Rien à signaler de ce côté.
        </p>
      {:else}
        {#each groups as group (group.account.id)}
          <div class="space-y-2">
            <div class="flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
              <h3 class="text-sm font-semibold">
                {group.account.label}
                <span class="text-xs font-normal text-muted-foreground">
                  · {group.rows.length} ligne{group.rows.length > 1 ? 's' : ''}
                </span>
              </h3>
              <Amount cents={group.totalCents} showSign class="text-sm font-semibold" />
            </div>

            <div class="divide-y divide-border/60">
              {#each group.rows as row (row.id)}
                <div class="flex items-baseline justify-between gap-3 py-1.5 text-xs">
                  <span class="min-w-0 flex items-baseline gap-2">
                    <span class="text-muted-foreground tabular-nums shrink-0">{formatDate(row.date)}</span>
                    <span class="truncate">{row.label}</span>
                  </span>
                  <Amount cents={row.cents} showSign class="shrink-0" />
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if count > 0}
      <div class="border-t border-border p-4 flex items-baseline justify-between gap-3">
        <span class="text-sm text-muted-foreground">
          {count} ligne{count > 1 ? 's' : ''} · effet sur l'écart
        </span>
        <Amount cents={grandTotalCents} showSign class="text-base font-bold" />
      </div>
    {/if}
  </Sheet.Content>
</Sheet.Root>
