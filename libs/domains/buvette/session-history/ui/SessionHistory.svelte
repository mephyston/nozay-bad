<script lang="ts">
  import { Badge } from '@nba/ui';
  import ItemsReport from './ItemsReport.svelte';
  import { day, euros } from './format';

  /** Les sessions passées, la plus récente d'abord, et ce que la buvette a vendu sur toutes. */
  let {
    sessions = [],
    items = [],
    categories = []
  }: { sessions?: any[]; items?: { name: string; quantity: number; amountCents: number }[]; categories?: { id: number; adminLabel: string }[] } = $props();

  const categoryName = (id: number) => categories.find((c) => c.id === id)?.adminLabel ?? `Catégorie n° ${id}`;
</script>

<div class="space-y-8">
  <section class="space-y-2">
    <h2 class="text-lg font-semibold">Sessions</h2>
    {#if sessions.length}
      <ul class="divide-y rounded-lg border">
        {#each sessions as s (s.id)}
          <li>
            <a href={`/admin/buvette/history?id=${s.id}`} class="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3 no-underline">
              <span class="min-w-0">
                <span class="block font-medium first-letter:uppercase">{day(s.businessDate)}</span>
                <span class="text-muted-foreground block text-sm">{categoryName(s.accountingCategoryId)} · {s.salesCount} vente{s.salesCount > 1 ? 's' : ''}</span>
              </span>
              <span class="flex items-center gap-3 text-sm">
                <span class="tabular-nums font-semibold">{euros(s.itemsCents)}</span>
                {#if s.status === 'open'}
                  <Badge>Ouverte</Badge>
                {:else if s.gapCents !== null && s.gapCents !== 0}
                  <Badge variant="destructive">Écart {euros(s.gapCents)}</Badge>
                {:else}
                  <Badge variant="secondary">Clôturée</Badge>
                {/if}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-muted-foreground text-sm">Aucune session pour l'instant.</p>
    {/if}
  </section>

  <section class="space-y-2">
    <h2 class="text-lg font-semibold">Ventes par article, toutes sessions</h2>
    <ItemsReport {items} />
  </section>
</div>
