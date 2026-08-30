<script lang="ts">
  import { PageHeader } from '@nba/ui';
  import { ProductsManager } from '@nba/shop-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<PageHeader
  title="Gestion des Produits"
  description="Consultez et modifiez les tarifs, stocks et statuts de la boutique."
/>

<div class="mt-6">
  <EcranDistant domaine="shop" ecran="products" variante="liste">
    {#snippet pret(d)}
      <ProductsManager category="all" products={d.products} />
    {/snippet}
  </EcranDistant>
</div>
