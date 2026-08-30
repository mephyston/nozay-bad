<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { MembersTable } from '@nba/members-ui';
  import EcranDistant from './EcranDistant.svelte';

  let seasonName = $state('');
  let errorMsg = $state<string | null>(null);
</script>

<PageHeader
  title="Adhérents"
  description={`Consultez et recherchez les membres inscrits au club${seasonName ? ` pour la saison ${seasonName}` : ''}.`}
/>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <EcranDistant
    domaine="members"
    ecran="list"
    variante="liste"
    onDonnees={(d) => {
      seasonName = d.seasonName ?? '';
      errorMsg = d.errorMsg ?? null;
    }}
  >
    {#snippet pret(d)}
      <MembersTable
        data={d.members}
        pagination={d.pagination}
        filters={d.filters}
        seasons={d.seasons}
      />
    {/snippet}
  </EcranDistant>
</div>
