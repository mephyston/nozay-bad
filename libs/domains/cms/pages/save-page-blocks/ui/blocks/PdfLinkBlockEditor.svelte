<script lang="ts">
  import { Input, Label, Button } from '@nba/ui';
  import { FilePlus, X } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import { humanSize } from '../../../../media/list-media/ui/media-upload';
  import type { PdfLinkBlock } from '../../../../shared/blocks';

  let { block = $bindable(), media = [], canUploadMedia = false } = $props<{
    block: PdfLinkBlock;
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
  }>();

  let pickerOpen = $state(false);

  const document_ = $derived(
    block.mediaId ? media.find((m: PickableMedia) => m.id === block.mediaId) ?? null : null
  );
</script>

<div class="space-y-3">
  <div class="space-y-1.5">
    <Label for="pdf-label">Libellé du lien</Label>
    <Input id="pdf-label" bind:value={block.label} placeholder="Télécharger le livret d'accueil" />
  </div>

  <div class="space-y-1.5">
    <Label>Document</Label>
    {#if document_}
      <div class="border-border flex items-center gap-3 rounded-md border p-2">
        <span class="text-2xl" aria-hidden="true">📄</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{document_.alt || document_.key.split('/').pop()}</span>
          <span class="text-muted-foreground block text-xs">{humanSize(document_.sizeBytes)}</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onclick={() => (pickerOpen = true)}>Remplacer</Button>
        <Button type="button" variant="ghost" size="icon-sm" onclick={() => (block.mediaId = 0)}>
          <X class="h-4 w-4" />
          <span class="sr-only">Retirer le document</span>
        </Button>
      </div>
    {:else}
      <Button type="button" variant="outline" class="gap-1.5" onclick={() => (pickerOpen = true)}>
        <FilePlus class="h-4 w-4" />
        Choisir un document
      </Button>
    {/if}
  </div>

  <div class="space-y-1.5">
    <Label for="pdf-description">Description</Label>
    <Input id="pdf-description" bind:value={block.description} />
  </div>
</div>

<MediaPicker
  bind:open={pickerOpen}
  {media}
  canUpload={canUploadMedia}
  kind="document"
  title="Document à mettre en téléchargement"
  onSelect={(item) => (block.mediaId = item.id)}
/>
