<script lang="ts">
  import { PagesManager } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant ecran="pages" variante="liste">
  {#snippet pret(d)}
    <PagesManager pages={d.pages} canWrite={d.canWrite} canDelete={d.canDelete} />
  {/snippet}
</EcranDistant>
