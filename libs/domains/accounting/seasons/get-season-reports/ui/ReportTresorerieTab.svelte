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
      </Table.Root>
    </div>

    {#if report.tresorerieDisponible}
      <div class="mt-6 pt-6 border-t border-border space-y-3">
        <h4 class="text-md font-bold text-foreground">Trésorerie Disponible & Régularisations</h4>
        <div class="bg-muted/30 rounded-xl p-4 space-y-2 border border-border text-sm">
          <div class="flex justify-between font-semibold">
            <span>Trésorerie comptable (soldes totaux)</span>
            <span>{formatAmount(report.tresorerieDisponible.totalGrossCashCents)}</span>
          </div>

          {#if report.tresorerieDisponible.inVaultCents > 0}
            <div class="flex justify-between pl-4 text-muted-foreground">
              <span>- dont chèques en coffre (non déposés)</span>
              <span>- {formatAmount(report.tresorerieDisponible.inVaultCents)}</span>
            </div>
          {/if}

          {#if report.tresorerieDisponible.pendingDebitCents > 0}
            <div class="flex justify-between pl-4 text-muted-foreground">
              <span>- dont paiements en attente de débit (CB)</span>
              <span>+ {formatAmount(report.tresorerieDisponible.pendingDebitCents)}</span>
            </div>
          {/if}

          <div class="flex justify-between font-bold text-base pt-2 border-t border-border/60 text-primary">
            <span>Trésorerie disponible en banque (Relevés)</span>
            <span>{formatAmount(report.tresorerieDisponible.netAvailableCashCents)}</span>
          </div>
        </div>

        {#if report.tresorerieDisponible.deferredRevenues.length > 0 || report.tresorerieDisponible.deferredExpenses.length > 0}
          <div class="mt-4 pt-4 border-t border-border/40 space-y-2">
            <h5 class="font-semibold text-xs uppercase text-muted-foreground">Impacts sur le résultat (Régularisations)</h5>
            <div class="bg-muted/30 rounded-xl p-4 space-y-2 border border-border text-sm">
              {#if report.tresorerieDisponible.deferredRevenues.length > 0}
                <div class="space-y-1 text-xs text-muted-foreground">
                  <span class="font-medium text-warning block">• Produits encaissés d'avance (à déduire du résultat) :</span>
                  {#each report.tresorerieDisponible.deferredRevenues as defRev}
                    <div class="flex justify-between pl-4">
                      <span>{defRev.categoryName}</span>
                      <span>- {formatAmount(defRev.amountCents)}</span>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if report.tresorerieDisponible.deferredExpenses.length > 0}
                <div class="space-y-1 text-xs text-muted-foreground mt-3">
                  <span class="font-medium text-info block">• Charges décaissées d'avance (à réintégrer au résultat) :</span>
                  {#each report.tresorerieDisponible.deferredExpenses as defExp}
                    <div class="flex justify-between pl-4">
                      <span>{defExp.categoryName}</span>
                      <span>+ {formatAmount(defExp.amountCents)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
