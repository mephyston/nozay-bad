<script lang="ts">
  import { Badge, PageHeader } from '@nba/ui';
  import { TransactionLedger } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Le grand livre, en coquille.
   *
   * Neuf paramètres d'URL portent l'état de cet écran — saison, page, catégorie, classe,
   * sens, compte, recherche, mois, taille de page. Ils sont transmis tels quels au relais
   * plutôt qu'énumérés un à un : l'URL reste la source de vérité, et un filtre ajouté
   * demain n'obligera pas à toucher trois fichiers.
   */

  let seasonName = $state('');
  let isClosed = $state(false);
</script>

<!--
  Un seul titre, et c'est celui du menu : « Grand livre ».

  L'écran en portait deux — « Comptabilité » ici, « Journal des écritures » dans le
  composant — soit deux blocs de titre empilés, un doublon de nom et une bande vide
  avant la première écriture. Le badge de clôture rejoint celui qui reste.
-->
<PageHeader
  title="Grand livre"
  description={`Consultez le grand livre comptable et suivez les mouvements de fonds de l'association${seasonName ? ` pour la saison ${seasonName}` : ''}.`}
  class="print:hidden"
>
  {#snippet actions()}
    {#if isClosed}
      <Badge variant="secondary" size="lg" shape="square">Saison clôturée (lecture seule)</Badge>
    {/if}
  {/snippet}
</PageHeader>

<div class="mt-4">
  <EcranDistant
    domaine="accounting"
    ecran="ledger"
    variante="liste"
    onDonnees={(d) => {
      seasonName = d.seasonName ?? '';
      isClosed = Boolean(d.isClosed);
    }}
  >
    {#snippet pret(d)}
      <TransactionLedger
        transactions={d.transactions}
        pagination={d.pagination}
        seasonId={d.seasonId}
        balances={d.balances}
        seasons={d.seasons}
        categories={d.categories}
        accountClasses={d.accountClasses}
        unreconciledChequesOnly={d.unreconciledChequesOnly}
        accountId={d.accountId}
        mainAccountId={d.mainAccountId}
        activeAccounts={d.accounts}
        paymentMethods={d.paymentMethods}
        members={d.members ?? []}
        searchQuery={d.searchQuery}
        month={d.month}
        limit={d.limit}
      />
    {/snippet}
  </EcranDistant>
</div>
