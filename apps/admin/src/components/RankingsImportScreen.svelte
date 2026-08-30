<script lang="ts">
  import { PageHeader, ErrorAlert, SeasonSelector } from '@nba/ui';
  import { RankingsImporter } from '@nba/teams-ui';
  import EcranDistant from './EcranDistant.svelte';

  let { season = '' }: { season?: string } = $props();

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

<!--
  L'import a sa propre page : c'est un geste rare — quelques fois par saison — et
  volumineux, qui n'a pas à occuper le haut d'un écran que le coach consulte chaque
  semaine.
-->
<PageHeader
  title="Importer les classements"
  description="Export « compétiteurs » de Poona. La date lue dans le fichier décide quel classement fera foi."
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
    ecran="import"
    variante="formulaire"
    parametres={{ season }}
    onDonnees={capter}
  >
    {#snippet pret(d)}
      {#if d.canImport}
        <RankingsImporter seasonCode={d.seasonCode} />
      {:else}
        <p class="text-muted-foreground text-sm">
          Vous n'avez pas le droit d'importer les classements.
        </p>
      {/if}
    {/snippet}
  </EcranDistant>
</div>
