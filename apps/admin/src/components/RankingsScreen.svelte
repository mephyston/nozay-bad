<script lang="ts">
  import { PageHeader, ErrorAlert, SeasonSelector } from '@nba/ui';
  import { RankingsManager } from '@nba/teams-ui';
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
  title="Classements"
  description="Les classements fédéraux, historisés par date de publication. Ils alimentent le calcul des valeurs d'équipe."
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
    ecran="classements"
    variante="liste"
    onDonnees={capter}
  >
    {#snippet pret(d)}
      <RankingsManager
        rankings={d.rankings}
        settings={d.settings}
        seasonCode={d.seasonCode}
        canImport={d.canImport}
        canWrite={d.canWrite}
      />
    {/snippet}
  </EcranDistant>
</div>
