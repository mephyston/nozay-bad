<script lang="ts">
  import { PageHeader, Badge } from '@nba/ui';
  import { InvoicesManager } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  let { parametres = {} }: { parametres?: Record<string, string> } = $props();

  let seasonName = $state('');
  let isClosed = $state(false);
</script>

<PageHeader
  title="Factures"
  description={`Création, suivi, validation et rapprochement comptable des factures émises par l'association${seasonName ? ` pour la saison ${seasonName}` : ''}.`}
  class="print:hidden"
>
  {#snippet actions()}
    {#if isClosed}
      <Badge variant="outline" size="lg">Saison clôturée (Lecture seule)</Badge>
    {/if}
  {/snippet}
</PageHeader>

<div class="mt-6">
  <EcranDistant
    domaine="accounting"
    ecran="invoices"
    variante="liste"
    {parametres}
    onDonnees={(d) => {
      seasonName = d.seasonName ?? '';
      isClosed = Boolean(d.isClosed);
    }}
  >
    {#snippet pret(d)}
      <InvoicesManager
        invoices={d.invoices}
        seasonId={d.seasonId}
        seasons={d.seasons}
        categories={d.categories}
      />
    {/snippet}
  </EcranDistant>
</div>
