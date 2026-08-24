<script lang="ts">
  import { Table, Card } from '@nba/ui';
  import type { ReportData, Season } from './report-types';
  import { formatAmount, formatDelta, accountLabels } from './report-utils';
  import ReportTreasuryForecast from './ReportTreasuryForecast.svelte';
import ReportAIAnalysis from './ReportAIAnalysis.svelte';

  let { report, selectedSeason, seasons = [], canUseAi = false }: { report: ReportData; selectedSeason: string; seasons?: Season[]; canUseAi?: boolean } = $props();

  const dispo = $derived(report.tresorerieDisponible);

  /*
   * Le tableau montrait un seul nombre, sous l'intitulé « Solde Réel Final ». C'était le solde
   * COMPTABLE, et il ne tombe juste sur aucun relevé dès qu'un chèque dort dans le coffre.
   * Les deux colonnes portent désormais leur nom, et l'écart n'apparaît que lorsqu'il existe.
   */
  const totalFinal = $derived(report.bilanTrésorerie.reduce((sum, item) => sum + item.finalBalance, 0));
  const totalInitial = $derived(report.bilanTrésorerie.reduce((sum, item) => sum + item.initialBalance, 0));
  const totalBanque = $derived(report.bilanTrésorerie.reduce((sum, item) => sum + (item.bankTheoreticalCents ?? item.finalBalance), 0));
</script>

<Card.Root>
  <Card.Content class="p-6 space-y-4">
    <!-- Printable Title for A4 -->
    <div class="hidden print:block text-center space-y-1 mb-6">
      <h3 class="text-xl font-bold tracking-tight">Bilan de Trésorerie</h3>
      <p class="text-xs text-muted-foreground">Saison {seasons.find(s => s.id === selectedSeason)?.name || selectedSeason}</p>
    </div>

    <h3 class="text-lg font-semibold no-print">Bilan de Trésorerie</h3>
    <div class="overflow-x-auto">
      <Table.Root class="w-full border-collapse text-left text-sm">
        <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
          <Table.Row>
            <Table.Head class="px-2 py-3 sm:p-4 font-bold text-foreground">Compte Financier</Table.Head>
            <Table.Head class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right">Solde Initial (1er sept.)</Table.Head>
            <Table.Head class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right">Mouvements de saison</Table.Head>
            <Table.Head class="px-2 py-3 sm:p-4 text-right font-bold text-foreground">Solde comptable</Table.Head>
            <Table.Head class="hidden md:table-cell px-2 py-3 sm:p-4 text-right">Disponible en banque</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each report.bilanTrésorerie as item}
            {@const banque = item.bankTheoreticalCents ?? item.finalBalance}
            {@const decale = banque !== item.finalBalance}
            <Table.Row>
              <Table.Cell class="px-2 py-3 sm:p-4 font-semibold align-top sm:align-middle">
                <div>{accountLabels[item.accountId] || item.accountId}</div>
                <div class="sm:hidden flex flex-col gap-0.5 mt-1 text-xs font-normal text-muted-foreground">
                  <span>Initial: {formatAmount(item.initialBalance)}</span>
                  <span class="{item.finalBalance - item.initialBalance >= 0 ? 'text-success' : 'text-destructive'}">
                    Mvmt: {formatDelta(item.finalBalance - item.initialBalance)}
                  </span>
                  {#if decale}
                    <span>En banque: {formatAmount(banque)}</span>
                  {/if}
                </div>
              </Table.Cell>
              <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right">{formatAmount(item.initialBalance)}</Table.Cell>
              <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right font-medium {item.finalBalance - item.initialBalance >= 0 ? 'text-success' : 'text-destructive'}">
                {formatDelta(item.finalBalance - item.initialBalance)}
              </Table.Cell>
              <Table.Cell class="px-2 py-3 sm:p-4 text-right font-bold align-top sm:align-middle">
                {formatAmount(item.finalBalance)}
                {#if decale}
                  <div class="md:hidden text-xs font-normal text-muted-foreground">en banque {formatAmount(banque)}</div>
                {/if}
              </Table.Cell>
              <Table.Cell class="hidden md:table-cell px-2 py-3 sm:p-4 text-right {decale ? 'font-medium' : 'text-muted-foreground'}">
                {formatAmount(banque)}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
        <Table.Footer class="bg-muted/50 font-bold">
          <Table.Row>
            <Table.Cell class="px-2 py-3 sm:p-4 text-foreground">Total Général</Table.Cell>
            <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right">
              {formatAmount(totalInitial)}
            </Table.Cell>
            <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right {totalFinal - totalInitial >= 0 ? 'text-success' : 'text-destructive'}">
              {formatDelta(totalFinal - totalInitial)}
            </Table.Cell>
            <Table.Cell class="px-2 py-3 sm:p-4 text-right text-foreground">
              {formatAmount(totalFinal)}
            </Table.Cell>
            <Table.Cell class="hidden md:table-cell px-2 py-3 sm:p-4 text-right text-foreground">
              {formatAmount(totalBanque)}
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>

{#if dispo}
  <!--
    Ce passage du solde comptable au solde disponible en banque existait déjà dans le PDF du
    rapport, et nulle part à l'écran : l'information juste ne se lisait que sur le papier.
  -->
  <Card.Root>
    <Card.Content class="p-6 space-y-4">
      <div>
        <h3 class="text-lg font-semibold">Du solde comptable au solde bancaire</h3>
        <p class="text-sm text-muted-foreground">
          Une écriture saisie déplace le solde des livres. Elle ne déplace le solde de la banque
          que le jour où l'argent y arrive vraiment.
        </p>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex items-baseline justify-between gap-4 font-semibold">
          <span>Trésorerie comptable (soldes totaux)</span>
          <span class="tabular-nums">{formatAmount(dispo.totalGrossCashCents)}</span>
        </div>
        {#if dispo.inVaultCents > 0}
          <div class="flex items-baseline justify-between gap-4 pl-4 text-muted-foreground">
            <span>dont chèques en coffre, non déposés</span>
            <span class="tabular-nums">− {formatAmount(dispo.inVaultCents)}</span>
          </div>
        {/if}
        {#if dispo.pendingDebitCents > 0}
          <div class="flex items-baseline justify-between gap-4 pl-4 text-muted-foreground">
            <span>dont paiements en attente de débit</span>
            <span class="tabular-nums">+ {formatAmount(dispo.pendingDebitCents)}</span>
          </div>
        {/if}
        <div class="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-semibold">
          <span>Trésorerie disponible en banque (relevés)</span>
          <span class="tabular-nums">{formatAmount(dispo.netAvailableCashCents)}</span>
        </div>
      </div>

      {#if dispo.inVaultCents === 0 && dispo.pendingDebitCents === 0}
        <p class="text-xs text-muted-foreground">
          Aucun décalage à cette date : les deux soldes coïncident.
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}

{#if report.projections?.treasuryForecast}
  <ReportTreasuryForecast forecast={report.projections.treasuryForecast} />
{/if}

<ReportAIAnalysis {report} section="tresorerie" seasonId={selectedSeason} {canUseAi} />
