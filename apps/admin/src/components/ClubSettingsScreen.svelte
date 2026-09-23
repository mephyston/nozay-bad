<script lang="ts">
  import { ClubSectionForm, ClubFeaturesForm, ClubAssetsForm, sectionSpec } from '@nba/club-ui';
  import { ErrorAlert, ResponsiveSheet } from '@nba/ui';
  import { oublierIdentite } from '../lib/identite';

  /**
   * Un réglage du club, ouvert en tiroir depuis le hub de configuration.
   *
   * Les données viennent du hub, qui les a déjà lues : ce composant n'en demande
   * aucune. Il les demandait, et le tiroir s'ouvrait alors **deux fois** — une feuille
   * « Chargement… » d'abord, la vraie ensuite, deux animations pour un seul appui.
   *
   * Toutes les sections lisent la même ligne de réglages : la découper par section
   * ferait neuf lectures pour la même chose.
   */
  let {
    section,
    donnees,
    open = false,
    onClose
  }: {
    section: string;
    /** Les réglages du club, lus une fois par le hub. */
    donnees: Record<string, any>;
    open?: boolean;
    onClose?: () => void;
  } = $props();

  const spec = $derived(sectionSpec(section));

  let ouvert = $state(open);

  function fermer(v: boolean) {
    if (!v) onClose?.();
    ouvert = v;
  }
</script>

{#if section === 'fonctionnalites'}
  <ClubFeaturesForm
    open={ouvert}
    onOpenChange={fermer}
    features={donnees.features}
    canWrite={donnees.canWrite}
    onSaved={oublierIdentite}
  />
{:else if section === 'documents'}
  <ClubAssetsForm
    open={ouvert}
    onOpenChange={fermer}
    settings={donnees.settings}
    mediaOrigin={donnees.mediaOrigin}
    canWrite={donnees.canWrite}
  />
{:else if spec}
  <ClubSectionForm
    open={ouvert}
    onOpenChange={fermer}
    {spec}
    values={donnees.settings}
    canWrite={donnees.canWrite}
    onSaved={oublierIdentite}
  />
{:else}
  <ResponsiveSheet open={ouvert} onOpenChange={fermer} title="Réglage inconnu" size="md">
    <ErrorAlert message="Ce réglage n’existe pas. Revenez à la configuration." />
  </ResponsiveSheet>
{/if}
