<script lang="ts">
  import { PageHeader, ErrorAlert, SeasonSelector } from '@nba/ui';
  import { DayValuesBoard } from '@nba/teams-ui';
  import EcranDistant from './EcranDistant.svelte';

  let {
    season = '',
    championship = '',
    day = ''
  }: { season?: string; championship?: string; day?: string } = $props();

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
  title="Contrôle des journées"
  description="La valeur de chaque équipe sur une journée, et les infractions qu'aucun capitaine ne peut voir seul."
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
    ecran="journees"
    variante="liste"
    parametres={{ season, championship, day }}
    onDonnees={capter}
  >
    {#snippet pret(d)}
      <!-- La journée affichée est celle que le relais a retenue : la demandée peut ne pas
           exister dans ce championnat, auquel cas il retombe sur la première. -->
      <DayValuesBoard
        board={d.board}
        days={d.days}
        championship={d.championship}
        dayNumber={d.dayNumber}
        seasonCode={d.seasonCode}
      />
    {/snippet}
  </EcranDistant>
</div>
