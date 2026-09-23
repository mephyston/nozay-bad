<script lang="ts">
  import { PagesManager, PageEditor } from '@nba/cms-ui';
  import { ErrorAlert, ResponsiveSheet } from '@nba/ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Les pages du site : la liste, et l'éditeur qui s'ouvre par-dessus.
   *
   * Créer une page ouvrait une feuille, la modifier changeait d'écran : deux gestes
   * voisins, deux grammaires. L'éditeur monte désormais du même endroit.
   *
   * L'écran d'édition garde son adresse propre — `/admin/website/pages/<id>` —, qui
   * reste le chemin des liens partagés et du retour après un enregistrement. Le tiroir
   * ne la remplace pas, il évite d'y aller.
   */
  let pageOuverte = $state<number | null>(null);
</script>

<EcranDistant ecran="pages" variante="liste">
  {#snippet pret(d)}
    <PagesManager
      pages={d.pages}
      canWrite={d.canWrite}
      canDelete={d.canDelete}
      onOpen={(id) => (pageOuverte = id)}
    />
  {/snippet}
</EcranDistant>

{#if pageOuverte !== null}
  <!--
    Sans en-tête ni croix propres : l'éditeur porte déjà sa barre — croix, titre,
    validation — et deux barres empilées diraient deux fois la même chose.

    `{#if}` autour, et non seulement `open` : l'éditeur charge la page qu'on ouvre, et
    le garder monté retiendrait la précédente.
  -->
  <ResponsiveSheet
    open={true}
    onOpenChange={(ouvert) => {
      if (!ouvert) pageOuverte = null;
    }}
    showCloseButton={false}
    title=""
    size="lg"
  >
    <EcranDistant ecran="page" variante="formulaire" parametres={{ id: pageOuverte }}>
      {#snippet pret(d)}
        {#if d.page}
          <PageEditor
            page={d.page}
            blocks={d.blocks}
            revisions={d.revisions}
            previewUrl={d.previewUrl}
            previewSigne={d.previewSigne}
            media={d.media}
            targets={d.targets}
            categories={d.categories}
            redirects={d.redirects}
            canWrite={d.canWrite}
            canDelete={d.canDelete}
            canUploadMedia={d.canUploadMedia}
            onClose={() => (pageOuverte = null)}
          />
        {:else}
          <!-- Le relais a répondu, mais sans page : elle a été supprimée entre-temps. -->
          <ErrorAlert message="Cette page n'existe pas ou a été supprimée." />
        {/if}
      {/snippet}
    </EcranDistant>
  </ResponsiveSheet>
{/if}
