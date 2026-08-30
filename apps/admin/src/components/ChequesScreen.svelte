<script lang="ts">
  import { PageHeader, ErrorAlert, Badge } from '@nba/ui';
  import { CheckDepositManager } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Les chèques et leurs bordereaux.
   *
   * Un seul îlot pour deux pages, qui ne diffèrent que par leur titre et l'onglet ouvert.
   * Elles chargeaient les mêmes données par deux gestionnaires jumeaux : les tenir en
   * double garantissait qu'ils finiraient par diverger.
   */
  let {
    titre,
    initialTab,
    parametres = {}
  }: {
    titre: string;
    initialTab: 'checks' | 'deposits';
    parametres?: Record<string, string>;
  } = $props();

  let seasonName = $state('');
  let isClosed = $state(false);
  let errorMsg = $state<string | null>(null);
</script>

<div class="no-print">
  <a
    href="/admin/accounting/cheques"
    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
    Retour aux remises de chèques
  </a>
</div>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <PageHeader
    title={titre}
    description={`Gestion et suivi des chèques physiques, génération de bordereaux de remise et rapprochement bancaire${seasonName ? ` pour la saison ${seasonName}` : ''}.`}
    class="print:hidden"
  >
    {#snippet actions()}
      {#if isClosed}
        <Badge variant="outline" size="lg">Saison clôturée (Lecture seule)</Badge>
      {/if}
    {/snippet}
  </PageHeader>
</div>

<div class="mt-6">
  <EcranDistant
    domaine="accounting"
    ecran="cheques"
    variante="liste"
    {parametres}
    onDonnees={(d) => {
      seasonName = d.seasonName ?? '';
      isClosed = Boolean(d.isClosed);
      errorMsg = d.errorMsg ?? null;
    }}
  >
    {#snippet pret(d)}
      <CheckDepositManager
        seasonId={d.seasonId}
        seasons={d.seasons}
        checks={d.checks}
        checkDeposits={d.checkDeposits}
        members={d.members}
        pendingBankTransactions={d.pendingBankTransactions}
        {initialTab}
        hideTabs={true}
      />
    {/snippet}
  </EcranDistant>
</div>
