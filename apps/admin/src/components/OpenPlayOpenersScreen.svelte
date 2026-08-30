<script lang="ts">
  import { ErrorAlert } from '@nba/ui';
  import { OpenPlayOpenersCard } from '@nba/schedules-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant domaine="schedules" ecran="ouvreurs" variante="liste">
  {#snippet pret(d)}
    {#if d.errorMsg}
      <div class="mb-6"><ErrorAlert message={d.errorMsg} /></div>
    {/if}

    <OpenPlayOpenersCard
      openers={d.openers}
      members={d.members}
      seasonCode={d.seasonCode}
      canWrite={d.canWrite}
    />
  {/snippet}
</EcranDistant>
