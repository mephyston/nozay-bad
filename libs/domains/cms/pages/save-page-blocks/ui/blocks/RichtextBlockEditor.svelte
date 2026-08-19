<script lang="ts">
  import { RichTextEditor } from '@nba/ui';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import { createMediaPick, asImage, asFileLink } from '../../../../media/list-media/ui/media-pick.svelte';
  import { websiteOrigin } from '../../../../media/media-url';
  import type { RichtextBlock } from '../../../../shared/blocks';

  let { block = $bindable(), media = [], canUploadMedia = false, targets = [] } = $props<{
    block: RichtextBlock;
    /** Médiathèque de la page hôte : sans elle, les boutons image et fichier ne s'affichent pas. */
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
    /** Pages et actualités du site, proposées à l'insertion d'un lien interne. */
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
  }>();

  /**
   * Cibles traduites dans le vocabulaire de `RichTextEditor`, qui ignore tout du CMS.
   *
   * Le statut est affiché sans filtrer : lier une page en brouillon est parfois
   * délibéré — on prépare un dossier, on publie les deux ensemble. Le masquer
   * laisserait l'auteur croire que la page n'existe pas ; l'afficher le prévient que
   * le lien tombera en 404 tant que la publication n'a pas suivi.
   */
  const linkSuggestions = $derived(
    targets.map((target) => ({
      href: target.path,
      label: target.title,
      hint: target.status === 'draft' ? 'Brouillon' : 'Publié'
    }))
  );

  const imagePick = createMediaPick(asImage);
  const filePick = createMediaPick(asFileLink);
  // Le droit de déposer suffit à ouvrir le sélecteur : masquer les boutons sur une
  // médiathèque vide y enfermerait l'auteur, puisque c'est désormais de là qu'on dépose.
  const hasMedia = $derived(media.length > 0 || canUploadMedia);
</script>

<RichTextEditor
  bind:value={block.html}
  mediaOrigin={websiteOrigin}
  {linkSuggestions}
  onPickImage={hasMedia ? () => imagePick.request() : undefined}
  onPickFile={hasMedia ? () => filePick.request() : undefined}
/>
<p class="text-muted-foreground mt-1 text-xs">
  Le titre principal de la page est déjà affiché : commencez la hiérarchie au niveau 2.
</p>

<MediaPicker
  bind:open={imagePick.open}
  {media}
  canUpload={canUploadMedia}
  kind="image"
  title="Image à insérer dans le texte"
  onSelect={(item) => imagePick.choose(item)}
/>

<MediaPicker
  bind:open={filePick.open}
  {media}
  canUpload={canUploadMedia}
  kind="document"
  title="Fichier à insérer"
  onSelect={(item) => filePick.choose(item)}
/>
