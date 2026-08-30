<script lang="ts">
  import { PageHeader, Badge } from '@nba/ui';
  import { CashBoxManager } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  let seasonName = $state('');
  let isClosed = $state(false);
</script>

<PageHeader
  title="Gestion de la Caisse"
  description={`Suivi des mouvements d'espèces et transactions physiques de la caisse de l'association${seasonName ? ` pour la saison ${seasonName}` : ''}.`}
  class="print:hidden"
>
  {#snippet actions()}
    <!-- Une saison clôturée se consulte, ne se modifie plus : le dire avant que
         quelqu'un n'essaie vaut mieux qu'un refus à l'enregistrement. -->
    {#if isClosed}
      <Badge variant="outline" size="lg">Saison clôturée (Lecture seule)</Badge>
    {/if}
  {/snippet}
</PageHeader>

<div class="mt-6">
  <EcranDistant
    domaine="accounting"
    ecran="cash-box"
    variante="liste"
    onDonnees={(d) => {
      seasonName = d.seasonName ?? '';
      isClosed = Boolean(d.isClosed);
    }}
  >
    {#snippet pret(d)}
      <CashBoxManager
        initialBalance={d.initialBalance}
        transactions={d.transactions}
        seasonId={d.seasonId}
        seasons={d.seasons}
      />
    {/snippet}
  </EcranDistant>
</div>
