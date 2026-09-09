<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { IndivSelection } from '@nba/schedules-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Le choix de l'entraîneur pour une soirée, en coquille.
   *
   * L'identifiant de la soirée vit dans la chaîne de requête (`?id=`), lue dans le
   * navigateur par `EcranDistant` : la page est figée, elle ne porte rien.
   */
  let title = $state('Candidats');
  let description = $state('');
</script>

<PageHeader {title} {description} />

<div class="mt-6">
  <EcranDistant
    domaine="schedules"
    ecran="indiv-candidats"
    variante="liste"
    onDonnees={(d) => {
      if (d.session) {
        title = `${d.session.label ?? 'Indiv'} · ${d.session.date}`;
        description = `${d.session.startTime}–${d.session.endTime}${d.session.venueName ? ` · ${d.session.venueName}` : ''}. Classés par équité : moins souvent retenus cette saison, puis plus jeunes, puis premiers arrivés.`;
      }
    }}
  >
    {#snippet pret(d)}
      {#if d.errorMsg}
        <div class="mb-6"><ErrorAlert message={d.errorMsg} /></div>
      {/if}
      {#if d.session}
        <IndivSelection session={d.session} candidates={d.candidates} canWrite={d.canWrite} />
      {/if}
      <p class="mt-6 text-sm"><a href="/admin/entrainement/indiv" class="font-semibold text-primary hover:underline">← Toutes les soirées</a></p>
    {/snippet}
  </EcranDistant>
</div>
