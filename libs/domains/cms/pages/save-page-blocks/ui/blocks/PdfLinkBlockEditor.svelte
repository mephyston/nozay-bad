<script lang="ts">
  import { Input, Label, Button, Checkbox } from '@nba/ui';
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

  /**
   * Préfixe d'identifiants propre à cette instance.
   *
   * Un bloc peut désormais apparaître deux fois sur le même écran — au premier niveau
   * et dans une colonne, ou dans deux colonnes voisines. Des `id` écrits en dur s'y
   * répéteraient, et cliquer un intitulé donnerait le champ de l'autre bloc.
   */
  const uid = $props.id();

  let pickerOpen = $state(false);

  const document_ = $derived(
    block.mediaId ? media.find((m: PickableMedia) => m.id === block.mediaId) ?? null : null
  );

  /** L'aperçu n'a de sens que pour un PDF : un `.docx` en cadre ne s'affiche pas. */
  const isPdf = $derived(document_?.mimeType === 'application/pdf');
</script>

<div class="space-y-3">
  <div class="space-y-1.5">
    <Label for={`${uid}-pdf-label`}>Libellé du lien</Label>
    <Input id={`${uid}-pdf-label`} bind:value={block.label} placeholder="Télécharger le livret d'accueil" />
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
    <Label for={`${uid}-pdf-description`}>Description</Label>
    <Input id={`${uid}-pdf-description`} bind:value={block.description} />
  </div>

  <div class="space-y-1.5">
    <label class="flex items-start gap-2 text-sm">
      <Checkbox
        checked={block.preview === true}
        onCheckedChange={(v) => (block.preview = v === true)}
        disabled={!isPdf}
      />
      <span>
        <span class="font-medium">Afficher un aperçu du document</span>
        <span class="text-muted-foreground block text-xs">
          {#if isPdf}
            Le document s'affiche dans un cadre sous le lien, sur ordinateur seulement :
            les navigateurs mobiles ne savent pas le rendre. Le lien reste le chemin
            d'accès dans tous les cas.
          {:else}
            Réservé aux PDF. Ce document n'en est pas un.
          {/if}
        </span>
      </span>
    </label>
  </div>

  {#if block.preview && isPdf}
    <div class="space-y-1.5">
      <Label for={`${uid}-pdf-height`}>Hauteur du cadre (px)</Label>
      <Input
        id={`${uid}-pdf-height`}
        type="number"
        min="200"
        max="2000"
        value={block.previewHeightPx ?? 720}
        oninput={(e) => (block.previewHeightPx = Number((e.currentTarget as HTMLInputElement).value) || undefined)}
      />
    </div>
  {/if}
</div>

<MediaPicker
  bind:open={pickerOpen}
  {media}
  canUpload={canUploadMedia}
  kind="document"
  title="Document à mettre en téléchargement"
  onSelect={(item) => (block.mediaId = item.id)}
/>
