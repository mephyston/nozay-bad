<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { PageEditor } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * L'éditeur d'une page, en coquille.
   *
   * Seul écran de la rubrique à porter sur un objet précis : son identifiant vient de
   * l'URL, traverse le relais en paramètre de requête, et repart avec chaque écriture.
   *
   * Le titre du document dépend de ce qu'on édite, et n'est donc plus connu au rendu
   * serveur : il est posé à l'arrivée des données. Sans cela, l'onglet resterait sur un
   * libellé générique — ce qui se remarque dès qu'on ouvre deux pages côte à côte.
   */
  let { id }: { id: number } = $props();

  function titrer(d: Record<string, any>) {
    if (d.page?.title) document.title = `${d.page.title} - NBA 91`;
  }
</script>

<EcranDistant ecran="page" variante="formulaire" parametres={{ id }} onDonnees={titrer}>
  {#snippet pret(d)}
    {#if d.page}
      <PageHeader title={d.page.title} description="Composez la page en empilant des blocs." />

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
      />
    {:else}
      <!-- Le relais a répondu, mais sans page : elle a été supprimée entre-temps, ou
           l'identifiant de l'URL ne désigne rien. -->
      <ErrorAlert message="Cette page n'existe pas ou a été supprimée." />
    {/if}
  {/snippet}
</EcranDistant>
