<script lang="ts">
  import { PageHeader } from '@nba/ui';
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
</script>

<PageHeader
  title="Comptabilité"
  description={`Consultez le grand livre comptable et suivez les mouvements de fonds de l'association${seasonName ? ` pour la saison ${seasonName}` : ''}.`}
  class="print:hidden"
/>

<div class="mt-6">
  <EcranDistant
    domaine="accounting"
    ecran="ledger"
    variante="liste"
    onDonnees={(d) => (seasonName = d.seasonName ?? '')}
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
        searchQuery={d.searchQuery}
        month={d.month}
        limit={d.limit}
      />
    {/snippet}
  </EcranDistant>
</div>
