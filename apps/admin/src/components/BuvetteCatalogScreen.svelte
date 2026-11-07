<script lang="ts">
  import { PageHeader } from '@nba/ui';
  import { BuvetteCatalog } from '@nba/buvette-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<PageHeader
  title="Catalogue de la buvette"
  description="Les articles vendus à la caisse, et le plafond de solde des cartes."
/>

<div class="mt-6">
  <EcranDistant domaine="buvette" ecran="catalog" variante="liste">
    {#snippet pret(d)}
      <BuvetteCatalog items={d.items} categories={d.categories} settings={d.settings} canWrite={d.canWrite} />
    {/snippet}
  </EcranDistant>
</div>
