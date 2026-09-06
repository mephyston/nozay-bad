<script lang="ts">
  import { Table, Card } from '@nba/ui';
  import type { ReportData, Season } from './report-types';
  import { formatAmount, formatDelta } from './report-utils';
  import ReportTreasuryForecast from './ReportTreasuryForecast.svelte';
import ReportAIAnalysis from './ReportAIAnalysis.svelte';

  let { report, selectedSeason, seasons = [], canUseAi = false }: { report: ReportData; selectedSeason: string; seasons?: Season[]; canUseAi?: boolean } = $props();


  /*
   * Le tableau montrait un seul nombre, sous l'intitulé « Solde Réel Final ». C'était le solde
   * COMPTABLE, et il ne tombe juste sur aucun relevé dès qu'un chèque dort dans le coffre.
   * Les deux colonnes portent désormais leur nom, et l'écart n'apparaît que lorsqu'il existe.
   */
  /*
   * Les comptes de tiers (classe 4, le compte d'attente des adhérents) ne sont pas de la
   * trésorerie : ils sortent du tableau et du total, et se lisent à part comme une dette.
   * Le total ne doit ni les compter, ni les compenser avec le compte courant qui a reçu l'argent.
   */
  const disponibilites = $derived(report.bilanTrésorerie.filter((item) => !item.thirdParty));
  const tiers = $derived(report.bilanTrésorerie.filter((item) => item.thirdParty));
  const tiersGross = $derived(tiers.reduce((sum, item) => sum + item.finalBalance, 0));

  const totalFinal = $derived(disponibilites.reduce((sum, item) => sum + item.finalBalance, 0));
  const totalInitial = $derived(disponibilites.reduce((sum, item) => sum + item.initialBalance, 0));
  /*
   * La colonne montre le solde du RELEVÉ, pas un solde bancaire calculé.
   *
   * Un nombre déduit des statuts se déplaçait à chaque saisie, sous un libellé qui promettait
   * la banque : deux écrans, deux définitions de « en banque ». Le relevé, lui, ne bouge sur
   * aucune écriture — et un compte sans relevé n'affiche rien plutôt qu'un ersatz.
   */
  const totalReleve = $derived(
    disponibilites.reduce((sum, item) => sum + (item.statementBalanceCents ?? 0), 0)
  );
  const auMoinsUnReleve = $derived(disponibilites.some((item) => item.statementBalanceCents !== null));

  function formatDay(iso: string | null | undefined): string {
    if (!iso) return '';
    const [, month, day] = iso.split('-');
    return `${day}/${month}`;
  }
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
            <Table.Head class="hidden md:table-cell px-2 py-3 sm:p-4 text-right">Solde du relevé</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each disponibilites as item}
            {@const releve = item.statementBalanceCents}
            {@const decale = releve !== null && releve !== undefined && releve !== item.finalBalance}
            <Table.Row>
              <Table.Cell class="px-2 py-3 sm:p-4 font-semibold align-top sm:align-middle">
                <div>{item.label || item.accountId}</div>
                <div class="sm:hidden flex flex-col gap-0.5 mt-1 text-xs font-normal text-muted-foreground">
                  <span>Initial: {formatAmount(item.initialBalance)}</span>
                  <span class="{item.finalBalance - item.initialBalance >= 0 ? 'text-success' : 'text-destructive'}">
                    Mvmt: {formatDelta(item.finalBalance - item.initialBalance)}
                  </span>
                  {#if releve !== null && releve !== undefined}
                    <span>Relevé au {formatDay(item.statementDate)}: {formatAmount(releve)}</span>
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
                  <div class="md:hidden text-xs font-normal text-muted-foreground">relevé {formatAmount(releve ?? 0)}</div>
                {/if}
              </Table.Cell>
              <Table.Cell class="hidden md:table-cell px-2 py-3 sm:p-4 text-right {decale ? 'font-medium' : 'text-muted-foreground'}">
                {#if releve !== null && releve !== undefined}
                  {formatAmount(releve)}
                  <div class="text-xs font-normal text-muted-foreground">au {formatDay(item.statementDate)}</div>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
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
              {auMoinsUnReleve ? formatAmount(totalReleve) : '—'}
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </div>

    {#if tiersGross !== 0}
      <!--
        Un solde négatif du compte d'attente est ce que le club doit encore rendre aux adhérents
        (viré par elles, pas encore crédité sur leur porte-monnaie Badnet). Un solde positif serait
        une avance que le club leur a consentie. Ni l'un ni l'autre n'est de la trésorerie.
      -->
      <div class="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm" data-testid="tiers-block">
        <div class="flex items-center justify-between font-semibold">
          <span>{tiersGross < 0 ? 'Sommes dues aux adhérents' : 'Avances consenties aux adhérents'}</span>
          <span>{formatAmount(Math.abs(tiersGross))}</span>
        </div>
        <ul class="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {#each tiers as item}
            <li class="flex justify-between"><span>{item.label || item.accountId}</span><span>{formatAmount(Math.abs(item.finalBalance))}</span></li>
          {/each}
        </ul>
        <p class="mt-1 text-xs text-muted-foreground">Hors trésorerie : fonds reçus pour le compte d'adhérents, à leur rendre.</p>
      </div>
    {/if}
  </Card.Content>
</Card.Root>

{#if report.projections?.treasuryForecast}
  <ReportTreasuryForecast forecast={report.projections.treasuryForecast} />
{/if}

<ReportAIAnalysis {report} section="tresorerie" seasonId={selectedSeason} {canUseAi} />
