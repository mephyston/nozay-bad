<script lang="ts">
  import { Table, Card } from '@nba/ui';
  import type { ReportData, Season } from './report-types';
  import { formatAmount, formatDelta, accountLabels } from './report-utils';
  import ReportTreasuryForecast from './ReportTreasuryForecast.svelte';
import ReportAIAnalysis from './ReportAIAnalysis.svelte';

  let { report, selectedSeason, seasons = [], userPermissions = [] }: { report: ReportData; selectedSeason: string; seasons?: Season[]; userPermissions?: string[] } = $props();
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
            <Table.Head class="px-2 py-3 sm:p-4 text-right font-bold text-foreground">Solde Réel Final</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each report.bilanTrésorerie as item}
            <Table.Row>
              <Table.Cell class="px-2 py-3 sm:p-4 font-semibold align-top sm:align-middle">
                <div>{accountLabels[item.accountId] || item.accountId}</div>
                <div class="sm:hidden flex flex-col gap-0.5 mt-1 text-xs font-normal text-muted-foreground">
                  <span>Initial: {formatAmount(item.initialBalance)}</span>
                  <span class="{item.finalBalance - item.initialBalance >= 0 ? 'text-success' : 'text-destructive'}">
                    Mvmt: {formatDelta(item.finalBalance - item.initialBalance)}
                  </span>
                </div>
              </Table.Cell>
              <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right">{formatAmount(item.initialBalance)}</Table.Cell>
              <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right font-medium {item.finalBalance - item.initialBalance >= 0 ? 'text-success' : 'text-destructive'}">
                {formatDelta(item.finalBalance - item.initialBalance)}
              </Table.Cell>
              <Table.Cell class="px-2 py-3 sm:p-4 text-right font-bold align-top sm:align-middle">{formatAmount(item.finalBalance)}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
        <Table.Footer class="bg-muted/50 font-bold">
          <Table.Row>
            <Table.Cell class="px-2 py-3 sm:p-4 text-foreground">Total Général</Table.Cell>
            <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right">
              {formatAmount(report.bilanTrésorerie.reduce((sum, item) => sum + item.initialBalance, 0))}
            </Table.Cell>
            <Table.Cell class="hidden sm:table-cell px-2 py-3 sm:p-4 text-right {report.bilanTrésorerie.reduce((sum, item) => sum + item.finalBalance - item.initialBalance, 0) >= 0 ? 'text-success' : 'text-destructive'}">
              {formatDelta(report.bilanTrésorerie.reduce((sum, item) => sum + item.finalBalance - item.initialBalance, 0))}
            </Table.Cell>
            <Table.Cell class="px-2 py-3 sm:p-4 text-right text-foreground">
              {formatAmount(report.bilanTrésorerie.reduce((sum, item) => sum + item.finalBalance, 0))}
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>

{#if report.projections?.treasuryForecast}
  <ReportTreasuryForecast forecast={report.projections.treasuryForecast} />
{/if}

<ReportAIAnalysis {report} section="tresorerie" seasonId={selectedSeason} {userPermissions} />
