<script lang="ts">
  import { PageHeader, ErrorAlert, SeasonSelector } from '@nba/ui';
  import { ChampionshipRulesPanel } from '@nba/teams-ui';
  import EcranDistant from './EcranDistant.svelte';

  let seasons = $state<any[]>([]);
  let seasonCode = $state('');
  let errorMsg = $state<string | null>(null);
  const capter = (d: Record<string, any>) => {
    seasons = d.seasons ?? [];
    seasonCode = d.seasonCode ?? '';
    errorMsg = d.errorMsg ?? null;
  };
</script>

{#if errorMsg}
  <div class="mb-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<PageHeader
  title="Règlements"
  description="Le règlement particulier de chaque championnat, tel que la fédération le publie."
>
  {#snippet actions()}
    {#if seasons.length}
      <SeasonSelector {seasons} current={seasonCode} />
    {/if}
  {/snippet}
</PageHeader>

<div class="mt-6">
  <EcranDistant
    domaine="teams"
    ecran="reglements"
    variante="formulaire"
    onDonnees={capter}
  >
    {#snippet pret(d)}
      <ChampionshipRulesPanel items={d.settings} seasonCode={d.seasonCode} canWrite={d.canWrite} />
    {/snippet}
  </EcranDistant>
</div>
