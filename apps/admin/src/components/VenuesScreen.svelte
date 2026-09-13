<script lang="ts">
  import { VenuesManager } from '@nba/schedules-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant domaine="schedules" ecran="gymnases">
  {#snippet pret(d)}
    <VenuesManager venues={d.venues} canWrite={d.canWrite} />
  {/snippet}
</EcranDistant>
