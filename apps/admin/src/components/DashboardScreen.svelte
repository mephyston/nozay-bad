<script lang="ts">
  import { PageHeader, SeasonSelector } from '@nba/ui';
  import DashboardOverview from './DashboardOverview.svelte';
  import EcranDistant from './EcranDistant.svelte';

  let {
    parametres = {},
    permissions = []
  }: { parametres?: Record<string, string>; permissions?: string[] } = $props();

  let seasons = $state<any[]>([]);
  let currentSeason = $state('');
</script>

<PageHeader
  title="Tableau de bord"
  description={`Voici le récapitulatif de votre activité${currentSeason ? ` pour la saison ${currentSeason}` : ''}.`}
>
  {#snippet actions()}
    {#if seasons.length}
      <SeasonSelector {seasons} current={currentSeason} />
    {/if}
  {/snippet}
</PageHeader>

<div class="mt-6">
  <EcranDistant
    domaine="dashboard"
    ecran="overview"
    variante="grille"
    {parametres}
    onDonnees={(d) => {
      seasons = d.seasons ?? [];
      currentSeason = d.currentSeason ?? '';
    }}
  >
    {#snippet pret(d)}
      <DashboardOverview data={d.data} {permissions} />
    {/snippet}
  </EcranDistant>
</div>
