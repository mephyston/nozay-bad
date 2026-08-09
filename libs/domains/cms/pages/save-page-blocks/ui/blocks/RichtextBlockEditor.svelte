<script lang="ts">
  import { RichTextEditor } from '@nba/ui';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import { createMediaPick, asImage, asFileLink } from '../../../../media/list-media/ui/media-pick.svelte';
  import type { RichtextBlock } from '../../../../shared/blocks';

  let { block = $bindable(), media = [] } = $props<{
    block: RichtextBlock;
    /** Médiathèque de la page hôte : sans elle, les boutons image et fichier ne s'affichent pas. */
    media?: PickableMedia[];
  }>();

  const imagePick = createMediaPick(asImage);
  const filePick = createMediaPick(asFileLink);
  const hasMedia = $derived(media.length > 0);
</script>

<RichTextEditor
  bind:value={block.html}
  onPickImage={hasMedia ? () => imagePick.request() : undefined}
  onPickFile={hasMedia ? () => filePick.request() : undefined}
/>
<p class="text-muted-foreground mt-1 text-xs">
  Le titre principal de la page est déjà affiché : commencez la hiérarchie au niveau 2.
</p>

<MediaPicker
  bind:open={imagePick.open}
  {media}
  kind="image"
  title="Image à insérer dans le texte"
  onSelect={(item) => imagePick.choose(item)}
/>

<MediaPicker
  bind:open={filePick.open}
  {media}
  kind="document"
  title="Fichier à insérer"
  onSelect={(item) => filePick.choose(item)}
/>
