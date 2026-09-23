<script lang="ts">
  import { ClubSectionForm, ClubFeaturesForm, ClubAssetsForm, sectionSpec } from '@nba/club-ui';
  import { ErrorAlert, ResponsiveSheet } from '@nba/ui';
  import EcranDistant from './EcranDistant.svelte';
  import { oublierIdentite } from '../lib/identite';

  /**
   * Un réglage du club, ouvert en tiroir depuis le hub de configuration.
   *
   * Toutes les sections lisent le même écran du relais (`settings`) : la ligne est
   * unique, la découper par section ferait huit lectures pour la même chose. Ce
   * composant ne fait que choisir le formulaire à afficher.
   *
   * Chaque formulaire porte **son propre** `FormSheet` — titre, erreur et validation au
   * même endroit que l'état qu'il enregistre. D'où la coquille de secours ci-dessous,
   * qui ne sert qu'au temps du chargement et aux refus : sans elle, un relais lent ou
   * un droit manquant ne montreraient rien du tout, l'appui sur la rangée semblant sans
   * effet.
   */
  let {
    section,
    open = false,
    onClose
  }: {
    section: string;
    open?: boolean;
    onClose?: () => void;
  } = $props();

  const spec = $derived(sectionSpec(section));

  /** Le formulaire a-t-il pris la main ? Sinon, la coquille montre ce qui se passe. */
  let ouvert = $state(open);

  function fermer(v: boolean) {
    if (!v) onClose?.();
    ouvert = v;
  }
</script>

<EcranDistant domaine="club" ecran="settings" variante="formulaire">
  {#snippet attente()}
    <ResponsiveSheet open={ouvert} onOpenChange={fermer} title="Chargement…" size="lg">
      <p class="text-muted-foreground py-4 text-sm">Lecture des réglages du club…</p>
    </ResponsiveSheet>
  {/snippet}

  {#snippet pret(d)}
    {#if section === 'fonctionnalites'}
      <ClubFeaturesForm
        open={ouvert}
        onOpenChange={fermer}
        features={d.features}
        canWrite={d.canWrite}
        onSaved={oublierIdentite}
      />
    {:else if section === 'documents'}
      <ClubAssetsForm
        open={ouvert}
        onOpenChange={fermer}
        settings={d.settings}
        mediaOrigin={d.mediaOrigin}
        canWrite={d.canWrite}
      />
    {:else if spec}
      <ClubSectionForm
        open={ouvert}
        onOpenChange={fermer}
        {spec}
        values={d.settings}
        canWrite={d.canWrite}
        onSaved={oublierIdentite}
      />
    {:else}
      <ResponsiveSheet open={ouvert} onOpenChange={fermer} title="Section inconnue" size="md">
        <ErrorAlert message="Ce réglage n’existe pas. Revenez à la configuration." />
      </ResponsiveSheet>
    {/if}
  {/snippet}
</EcranDistant>
