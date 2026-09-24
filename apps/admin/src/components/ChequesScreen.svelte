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
  }: {
    titre: string;
    initialTab: 'checks' | 'deposits';
  } = $props();

  let seasonName = $state('');
  let isClosed = $state(false);
  let errorMsg = $state<string | null>(null);
</script>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <!--
    Le retour au hub des chèques passe du lien de texte au rond à chevron, à gauche du
    titre et sur téléphone seulement : posé au-dessus du titre, il était hors du pouce
    et disparaissait au premier défilement. Le fil d'Ariane le remplace au-dessus de
    768 px.
  -->
  <PageHeader
    retour={{ href: '/admin/accounting/cheques', libelle: 'Retour aux remises de chèques' }}
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
