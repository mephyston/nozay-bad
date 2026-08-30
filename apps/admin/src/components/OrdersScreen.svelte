<script lang="ts">
  import { PageHeader, ErrorAlert, Badge } from '@nba/ui';
  import { OrdersManager } from '@nba/shop-ui';
  import EcranDistant from './EcranDistant.svelte';

  let {
    parametres = {},
    initialAction = null
  }: { parametres?: Record<string, string>; initialAction?: string | null } = $props();

  let seasonName = $state('');
  let isClosed = $state(false);
</script>

<PageHeader
  title="Commandes Boutique"
  description={`Validez les demandes d'achats, encaissez les commandes en attente de paiement et consultez l'historique${seasonName ? ` pour la saison ${seasonName}` : ''}.`}
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
    domaine="shop"
    ecran="orders"
    variante="liste"
    {parametres}
    onDonnees={(d) => {
      seasonName = d.seasonName ?? '';
      isClosed = Boolean(d.isClosed);
    }}
  >
    {#snippet pret(d)}
      <OrdersManager
        seasons={d.seasons}
        orders={d.orders}
        products={d.products}
        members={d.members}
        seasonId={d.season}
        {initialAction}
      />
    {/snippet}
  </EcranDistant>
</div>
