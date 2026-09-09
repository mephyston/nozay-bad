<script lang="ts">
  import { ErrorAlert } from '@nba/ui';
  import { IndivManager } from '@nba/schedules-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant domaine="schedules" ecran="indiv" variante="liste">
  {#snippet pret(d)}
    {#if d.errorMsg}
      <div class="mb-6"><ErrorAlert message={d.errorMsg} /></div>
    {/if}
    <IndivManager sessions={d.sessions} venues={d.venues} slots={d.slots} canWrite={d.canWrite} />
  {/snippet}
</EcranDistant>
