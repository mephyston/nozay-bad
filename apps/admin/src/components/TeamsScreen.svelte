<script lang="ts">
  import { PageHeader, ErrorAlert, SeasonSelector } from '@nba/ui';
  import { TeamsManager } from '@nba/teams-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Les équipes engagées, en coquille.
   *
   * L'écran porte sur une saison et un championnat, tous deux dans l'URL : ils sont
   * transmis au relais, qui résout la saison à afficher — celle demandée, ou celle qui
   * court.
   *
   * L'en-tête est rendu **hors** de l'attente, et le sélecteur s'y ajoute à l'arrivée des
   * données : titre et fil d'Ariane sont connus d'avance, et les faire attendre avec le
   * reste ferait sauter la page au moment où elle se remplit.
   */
  let { season = '', championship = '' }: { season?: string; championship?: string } = $props();

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
  title="Équipes"
  description="Les équipes engagées en interclubs, leur staff et leur effectif. Le numéro d'équipe porte la hiérarchie que le règlement contrôle."
>
  {#snippet actions()}
    <!--
      Le sélecteur est visible, et non déduit : une équipe appartient à une saison, et
      rien d'autre à l'écran ne dit laquelle on est en train de garnir.
    -->
    {#if seasons.length}
      <SeasonSelector {seasons} current={seasonCode} />
    {/if}
  {/snippet}
</PageHeader>

<div class="mt-6">
  <EcranDistant
    domaine="teams"
    ecran="teams"
    variante="liste"
    parametres={{ season, championship }}
    onDonnees={capter}
  >
    {#snippet pret(d)}
      <TeamsManager
        teams={d.teams}
        members={d.members}
        days={d.days}
        daysChampionship={d.daysChampionship}
        seasonCode={d.seasonCode}
        canWrite={d.canWrite}
        canDelete={d.canDelete}
      />
    {/snippet}
  </EcranDistant>
</div>
