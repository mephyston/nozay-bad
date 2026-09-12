<script lang="ts">
  import { PageHeader, SeasonSelector } from '@nba/ui';
  import DashboardOverview from './DashboardOverview.svelte';
  import EcranDistant from './EcranDistant.svelte';

  let seasons = $state<any[]>([]);
  let permissions = $state<string[]>([]);
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
    onDonnees={(d) => {
      seasons = d.seasons ?? [];
      currentSeason = d.currentSeason ?? '';
      permissions = d.permissions ?? [];
    }}
  >
    {#snippet pret(d)}
      <DashboardOverview data={d.data} {permissions} />
    {/snippet}
  </EcranDistant>
</div>
