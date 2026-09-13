<script lang="ts">
  import { ClubSectionForm, ClubFeaturesForm, ClubAssetsForm, sectionSpec } from '@nba/club-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Un écran de la configuration du club, choisi par son nom.
   *
   * Toutes les pages de la rubrique lisent le même écran du relais (`settings`) : la
   * ligne est unique, la découper par section ferait huit lectures pour la même chose.
   * Ce composant ne fait que choisir le formulaire à afficher.
   */
  const { section }: { section: string } = $props();
  const spec = sectionSpec(section);
</script>

<EcranDistant domaine="club" ecran="settings" variante="formulaire">
  {#snippet pret(d)}
    {#if section === 'fonctionnalites'}
      <ClubFeaturesForm features={d.features} canWrite={d.canWrite} />
    {:else if section === 'documents'}
      <ClubAssetsForm settings={d.settings} mediaOrigin={d.mediaOrigin} canWrite={d.canWrite} />
    {:else if spec}
      <ClubSectionForm {spec} values={d.settings} canWrite={d.canWrite} />
    {:else}
      <p class="text-sm text-destructive">Section inconnue.</p>
    {/if}
  {/snippet}
</EcranDistant>
