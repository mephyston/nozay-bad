<script lang="ts">
  import MobileDock from './MobileDock.svelte';
  import { dockDePage, type ActionDeListe } from '../../lib/page-dock.svelte.js';

  /**
   * Un écran factice qui déclare puis rend la barre du bas.
   *
   * Sert les stories, et rien d'autre : c'est le seul moyen de reproduire l'ordre
   * réel — l'écran déclare depuis son effet, la barre se monte ensuite — que des
   * `{@const}` dans une story ne reproduisent pas, le compilateur éliminant une
   * constante dont personne ne lit la valeur.
   */
  let {
    actions = [],
    avecRecherche = true
  }: {
    actions?: ActionDeListe[];
    avecRecherche?: boolean;
  } = $props();

  $effect(() => {
    const retraits = [dockDePage.declarerActions(actions)];
    if (avecRecherche) {
      retraits.push(
        dockDePage.declarerRecherche({
          placeholder: 'Rechercher un adhérent',
          valeur: '',
          onSubmit: () => {},
          filtres: { actif: false, ouvrir: () => {} }
        })
      );
    }
    return () => retraits.forEach((r) => r());
  });
</script>

<div class="h-screen w-full bg-background">
  <MobileDock onMenuClick={() => {}} />
</div>
