<script lang="ts">
  import { PageHeader } from '@nba/ui';
  import { BuvetteSession } from '@nba/buvette-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<PageHeader
  title="Caisse de la buvette"
  description="Ouvrez la caisse avant le service, clôturez-la en comptant les espèces."
/>

<div class="mt-6">
  <EcranDistant domaine="buvette" ecran="session" variante="formulaire">
    {#snippet pret(d)}
      <BuvetteSession current={d.current} categories={d.categories} cardsDebtCents={d.cardsDebtCents} canOpen={d.canOpen} canClose={d.canClose} canAbandon={d.canAbandon} />
    {/snippet}
  </EcranDistant>
</div>
