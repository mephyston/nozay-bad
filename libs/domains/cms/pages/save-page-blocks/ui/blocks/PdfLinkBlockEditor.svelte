<script lang="ts">
  import { FormField, Input, MediaField, SwitchField } from '@nba/ui';
  import { FileText } from '@lucide/svelte';
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

<div class="space-y-4">
  <FormField id={`${uid}-pdf-label`} label="Libellé du lien">
    <Input id={`${uid}-pdf-label`} bind:value={block.label} placeholder="Télécharger le livret d'accueil" />
  </FormField>

  <!--
    La même rangée que l'image d'un produit ou la couverture d'une actualité : appui
    pour choisir, puis le fichier sur sa propre ligne avec la pastille de retrait. Un
    document n'ayant pas de vignette, la rangée montre son icône.
  -->
  <FormField id={`${uid}-pdf-media`} label="Document">
    <MediaField
      id={`${uid}-pdf-media`}
      label="Document"
      max={1}
      icon={FileText}
      preview={document_ ? [null] : null}
      names={document_ ? [document_.alt || document_.key.split('/').pop() || 'Document'] : undefined}
      hint={document_ ? humanSize(document_.sizeBytes) : undefined}
      onBrowse={() => (pickerOpen = true)}
      onClear={() => (block.mediaId = 0)}
    />
  </FormField>

  <FormField id={`${uid}-pdf-description`} label="Description" hint="Facultative.">
    <Input id={`${uid}-pdf-description`} bind:value={block.description} />
  </FormField>

  <SwitchField
    id={`${uid}-pdf-preview`}
    label="Afficher un aperçu du document"
    hint={isPdf
      ? "Le document s'affiche dans un cadre sous le lien, sur ordinateur seulement : les navigateurs mobiles ne savent pas le rendre. Le lien reste le chemin d'accès dans tous les cas."
      : "Réservé aux PDF. Ce document n'en est pas un."}
    checked={block.preview === true}
    disabled={!isPdf}
    onChange={(v) => (block.preview = v)}
  />

  {#if block.preview && isPdf}
    <FormField id={`${uid}-pdf-height`} label="Hauteur du cadre (px)" hint="Entre 200 et 2000.">
      <Input
        id={`${uid}-pdf-height`}
        type="number"
        min="200"
        max="2000"
        value={block.previewHeightPx ?? 720}
        oninput={(e) => (block.previewHeightPx = Number((e.currentTarget as HTMLInputElement).value) || undefined)}
      />
    </FormField>
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
