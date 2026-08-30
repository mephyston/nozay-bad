<script lang="ts">
  import { SchedulesManager } from '@nba/schedules-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant domaine="schedules" ecran="schedules" variante="liste">
  {#snippet pret(d)}
    <SchedulesManager slots={d.slots} venues={d.venues} canWrite={d.canWrite} />
  {/snippet}
</EcranDistant>
