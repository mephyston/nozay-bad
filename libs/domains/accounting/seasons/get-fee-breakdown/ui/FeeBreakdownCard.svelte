<script lang="ts">
  import { PiggyBank, Info } from '@lucide/svelte';
  import { Card } from '@nba/ui';
  import type { FeeBreakdown } from '../dto';
  import { euros, percent, sourceLabel, chargeRows, resourceRows, otherResourceNames } from './fee-breakdown-view';

  /**
   * « Où va votre cotisation » : le même composant pour le bureau et pour l'adhérent.
   *
   * Deux listes de barres, une seule teinte : la longueur dit la part, l'étiquette et le
   * montant disent le reste, sans légende à décoder. Avec `feeCents`, l'adhérent lit sa
   * propre cotisation découpée ; sans, le bureau lit le coût moyen d'un adhérent.
   */
  let { data, feeCents, showDetails = false }: { data: FeeBreakdown; feeCents?: number; showDetails?: boolean } = $props();

  const charges = $derived(chargeRows(data, feeCents));
  const resources = $derived(resourceRows(data));
  const others = $derived(otherResourceNames(data));
  const maxCharge = $derived(Math.max(1, ...charges.map((r) => r.cents)));
  const maxResource = $derived(Math.max(1, ...resources.map((r) => r.cents)));
</script>

{#snippet bar(label: string, cents: number, max: number, highlight: boolean, detail?: { label: string; cents: number }[])}
  <li class="space-y-1">
    <div class="flex items-baseline justify-between gap-3 text-sm">
      <span class={highlight ? 'font-semibold text-foreground' : 'text-foreground'}>{label}</span>
      <span class="tabular-nums font-medium text-foreground whitespace-nowrap">{euros(cents)}</span>
    </div>
    <div class="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
      <div class="h-full rounded-full {highlight ? 'bg-primary' : 'bg-primary/60'}" style="width: {Math.max(2, (cents / max) * 100)}%"></div>
    </div>
    {#if detail && detail.length > 0}
      <p class="text-xs text-muted-foreground">
        {detail.map((d) => `${d.label} ${euros(d.cents)}`).join(' · ')}
      </p>
    {/if}
  </li>
{/snippet}

<Card.Root class="shadow-sm" data-testid="fee-breakdown">
  <Card.Header class="px-5 py-4 border-b border-border flex flex-row items-center gap-3">
    <PiggyBank class="w-5 h-5 text-primary shrink-0" />
    <div>
      <Card.Title class="text-base font-semibold text-foreground">Où va votre cotisation</Card.Title>
      <p class="text-xs text-muted-foreground mt-0.5">{sourceLabel(data)}</p>
    </div>
  </Card.Header>

  <Card.Content class="p-4 sm:p-6 space-y-6">
    {#if data.memberCount === 0 || data.totalChargesCents === 0}
      <p class="text-sm text-muted-foreground">Pas encore assez de chiffres pour cette saison.</p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p class="text-xs text-muted-foreground">Ce que coûte un adhérent au club</p>
          <p class="text-2xl font-bold tabular-nums text-foreground">{euros(data.costPerMemberCents)}</p>
        </div>
        <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p class="text-xs text-muted-foreground">Cotisation moyenne versée</p>
          <p class="text-2xl font-bold tabular-nums text-foreground">
            {euros(data.averageFeeCents)}
            <span class="text-sm font-medium text-muted-foreground">soit {percent(data.feeCoverage)} du coût</span>
          </p>
        </div>
      </div>

      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-foreground">
          {feeCents !== undefined ? `Vos ${euros(feeCents)} de cotisation servent à` : 'Ce que coûte un adhérent, poste par poste'}
        </h3>
        <ul class="space-y-3">
          {#each charges as row, i (row.key)}
            {@render bar(row.label, row.cents, maxCharge, false, showDetails ? data.charges[i].categories : undefined)}
          {/each}
        </ul>
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-foreground">Qui finance un adhérent</h3>
        <ul class="space-y-3">
          {#each resources as row, i (row.key)}
            {@render bar(row.label, row.cents, maxResource, row.highlight, showDetails ? data.resources[i].categories : undefined)}
          {/each}
        </ul>
      </section>

      {#if data.gapPerMemberCents > 0}
        <div class="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <Info class="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p>
            Avec les seules cotisations, il manquerait <strong class="tabular-nums">{euros(data.gapPerMemberCents)}</strong> par adhérent.
            {#if others}C'est ce que comblent {others}, grâce aux bénévoles qui les font vivre.{/if}
          </p>
        </div>
      {/if}

      {#if showDetails && data.progress}
        <p class="text-xs text-muted-foreground">
          Dépenses déjà passées cette saison : {euros(data.progress.realisedChargesCents)} sur {euros(data.progress.plannedChargesCents)} prévues.
          Calcul sur {data.memberCount} adhérents.
        </p>
      {:else if showDetails}
        <p class="text-xs text-muted-foreground">Calcul sur {data.memberCount} adhérents.</p>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>
