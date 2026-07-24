<script lang="ts">
  import { Table, Card } from '@nba/ui';
  import type { ReportData, Season } from './report-types';
  import { formatAmount, formatDelta, accountLabels } from './report-utils';

  let { report, selectedSeason, seasons = [] }: { report: ReportData; selectedSeason: string; seasons?: Season[] } = $props();
</script>

<Card.Root>
  <Card.Content class="p-6 space-y-4">
    <!-- Printable Title for A4 -->
    <div class="hidden print:block text-center space-y-1 mb-6">
      <h3 class="text-xl font-bold tracking-tight">Bilan de Trésorerie</h3>
      <p class="text-xs text-muted-foreground">Saison {seasons.find(s => s.id === selectedSeason)?.name || selectedSeason}</p>
    </div>

    <h3 class="text-lg font-semibold no-print">2. Bilan de Trésorerie</h3>
    <div class="overflow-x-auto">
      <Table.Root class="w-full border-collapse text-left text-sm">
        <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
          <Table.Row>
            <Table.Head class="p-4">Compte Financier</Table.Head>
            <Table.Head class="p-4 text-right">Solde Initial (1er sept.)</Table.Head>
            <Table.Head class="p-4 text-right">Mouvements de saison</Table.Head>
            <Table.Head class="p-4 text-right">Solde Réel Final</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each report.bilanTrésorerie as item}
            <Table.Row>
              <Table.Cell class="p-4 font-semibold">{accountLabels[item.accountId] || item.accountId}</Table.Cell>
              <Table.Cell class="p-4 text-right">{formatAmount(item.initialBalance)}</Table.Cell>
              <Table.Cell class="p-4 text-right font-medium {item.finalBalance - item.initialBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}">
                {formatDelta(item.finalBalance - item.initialBalance)}
              </Table.Cell>
              <Table.Cell class="p-4 text-right font-bold">{formatAmount(item.finalBalance)}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    {#if report.tresorerieDisponible}
      <div class="mt-6 pt-6 border-t border-border space-y-3">
        <h4 class="text-md font-bold text-foreground">Trésorerie Disponible & Régularisations</h4>
        <div class="bg-muted/30 rounded-xl p-4 space-y-2 border border-border text-sm">
          <div class="flex justify-between font-semibold">
            <span>Trésorerie brute cumulée au {report.arretedAu || '31/08'}</span>
            <span>{formatAmount(report.tresorerieDisponible.totalGrossCashCents)}</span>
          </div>

          {#if report.tresorerieDisponible.deferredRevenues.length > 0}
            <div class="pl-4 space-y-1 text-xs text-muted-foreground">
              <span class="font-medium text-amber-600 dark:text-amber-400 block">• dont encaissé d'avance au titre de la saison suivante :</span>
              {#each report.tresorerieDisponible.deferredRevenues as defRev}
                <div class="flex justify-between pl-4">
                  <span>{defRev.categoryName}</span>
                  <span>({formatAmount(defRev.amountCents)})</span>
                </div>
              {/each}
            </div>
          {/if}

          {#if report.tresorerieDisponible.deferredExpenses.length > 0}
            <div class="pl-4 space-y-1 text-xs text-muted-foreground">
              <span class="font-medium text-indigo-600 dark:text-indigo-400 block">• dont décaissé d'avance au titre de la saison suivante :</span>
              {#each report.tresorerieDisponible.deferredExpenses as defExp}
                <div class="flex justify-between pl-4">
                  <span>{defExp.categoryName}</span>
                  <span>+{formatAmount(defExp.amountCents)}</span>
                </div>
              {/each}
            </div>
          {/if}

          <div class="flex justify-between font-bold text-base pt-2 border-t border-border/60 text-primary">
            <span>Trésorerie réellement disponible</span>
            <span>{formatAmount(report.tresorerieDisponible.netAvailableCashCents)}</span>
          </div>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
