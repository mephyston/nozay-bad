<script lang="ts">
  import { RedirectsManager } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant ecran="redirects" variante="liste">
  {#snippet pret(d)}
    <RedirectsManager redirects={d.redirects} canWrite={d.canWrite} />
  {/snippet}
</EcranDistant>
