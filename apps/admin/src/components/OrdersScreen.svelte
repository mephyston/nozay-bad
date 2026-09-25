<script lang="ts">
  import { PageHeader, ErrorAlert, Badge } from '@nba/ui';
  import { OrdersManager } from '@nba/shop-ui';
  import EcranDistant from './EcranDistant.svelte';

  /*
    L'action initiale vient de l'URL, lue dans le navigateur : une page figée n'a pas de
    chaîne de requête à passer, et seul le client sait ce que l'utilisateur regarde.
  */
  const actionInitiale =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('action');

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
        paymentMethods={d.paymentMethods ?? []}
        canWrite={Boolean(d.canWrite)}
        initialAction={actionInitiale}
      />
    {/snippet}
  </EcranDistant>
</div>
