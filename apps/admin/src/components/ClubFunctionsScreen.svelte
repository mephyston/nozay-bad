<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { ClubFunctionsBoard } from '@nba/members-ui';
  import EcranDistant from './EcranDistant.svelte';

  let errorMsg = $state<string | null>(null);
</script>

<PageHeader
  title="Dirigeants"
  description="Les fonctions au club de la saison : bureau, comité d'administration et entraîneurs."
/>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <EcranDistant
    domaine="members"
    ecran="dirigeants"
    variante="liste"
    onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}
  >
    {#snippet pret(d)}
      <ClubFunctionsBoard
        assignments={d.assignments}
        seasons={d.seasons}
        season={d.season}
        members={d.members}
        canWrite={d.canWrite}
      />
    {/snippet}
  </EcranDistant>
</div>
