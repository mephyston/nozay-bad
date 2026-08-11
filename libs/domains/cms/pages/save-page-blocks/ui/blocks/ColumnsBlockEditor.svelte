<script lang="ts">
  import { Button, Input, Label, RichTextEditor } from '@nba/ui';
  import { Plus, Trash2, ImagePlus, X } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import { mediaUrl, websiteOrigin } from '../../../../media/media-url';
  import type { ColumnsBlock } from '../../../../shared/blocks';

  /**
   * Contenus côte à côte.
   *
   * Remplace les tableaux de mise en page de l'ancien site — `<td width="45%">` —, qui
   * restaient côte à côte jusque sur un téléphone. Ici la grille se replie en pile
   * sous 768 px, sans que le rédacteur n'ait rien à faire.
   */
  let {
    block = $bindable(),
    media = [],
    canUploadMedia = false,
    targets = []
  } = $props<{
    block: ColumnsBlock;
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
    /** Pages et actualités du site, proposées à l'insertion d'un lien interne. */
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
  }>();

  const linkSuggestions = $derived(
    targets.map((target: { path: string; title: string; status?: string }) => ({
      href: target.path,
      label: target.title,
      hint: target.status === 'draft' ? 'Brouillon' : 'Publié'
    }))
  );

  /**
   * Colonne dont le sélecteur d'image est ouvert.
   *
   * L'ouverture est un état à part, et lié : `MediaPicker` referme lui-même son
   * panneau en écrivant dans `open`. Le déduire de `pickingFor` sans liaison ferait
   * rouvrir le panneau aussitôt refermé.
   */
  let pickingFor = $state<number | null>(null);
  let pickerOpen = $state(false);

  const imageOf = (mediaId?: number) =>
    mediaId ? media.find((item: PickableMedia) => item.id === mediaId) ?? null : null;

  function addColumn() {
    if (block.items.length >= 3) return;
    block.items = [...block.items, { html: '<p></p>' }];
  }

  function removeColumn(index: number) {
    // Deux au minimum : en dessous, ce n'est plus une mise en colonnes mais un bloc
    // de texte, et le schéma le refuserait à l'enregistrement.
    if (block.items.length <= 2) return;
    block.items = block.items.filter((_: unknown, i: number) => i !== index);
  }

  function openPicker(index: number) {
    pickingFor = index;
    pickerOpen = true;
  }

  function chooseImage(item: PickableMedia) {
    if (pickingFor === null) return;
    block.items[pickingFor].mediaId = item.id;
    pickingFor = null;
    pickerOpen = false;
  }
</script>

<div class="space-y-4">
  <div class="space-y-1.5">
    <Label for="columns-heading">Titre (facultatif)</Label>
    <Input
      id="columns-heading"
      bind:value={block.heading}
      placeholder="Titre affiché au-dessus des colonnes"
      maxlength={160}
    />
  </div>

  <div class="grid gap-3 md:grid-cols-2">
    {#each block.items as column, index (index)}
      {@const image = imageOf(column.mediaId)}
      <div class="border-border space-y-2 rounded-lg border p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Colonne {index + 1}</span>
          {#if block.items.length > 2}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Retirer la colonne ${index + 1}`}
              onclick={() => removeColumn(index)}
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          {/if}
        </div>

        {#if image}
          <div class="flex items-center gap-2">
            <img
              src={mediaUrl(image.key)}
              alt={image.alt}
              class="border-border h-16 w-24 shrink-0 rounded border object-cover"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="gap-1.5"
              onclick={() => (block.items[index].mediaId = undefined)}
            >
              <X class="h-4 w-4" />
              Retirer l'image
            </Button>
          </div>
        {:else}
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            onclick={() => openPicker(index)}
          >
            <ImagePlus class="h-4 w-4" />
            Ajouter une image
          </Button>
        {/if}

        <RichTextEditor
          bind:value={block.items[index].html}
          mediaOrigin={websiteOrigin}
          {linkSuggestions}
        />
      </div>
    {/each}
  </div>

  {#if block.items.length < 3}
    <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={addColumn}>
      <Plus class="h-4 w-4" />
      Ajouter une colonne
    </Button>
  {/if}

  <p class="text-muted-foreground text-xs">
    Les colonnes se placent côte à côte sur ordinateur, et s'empilent sur téléphone.
  </p>
</div>

<MediaPicker
  bind:open={pickerOpen}
  {media}
  kind="image"
  title="Image de la colonne"
  canUpload={canUploadMedia}
  onSelect={chooseImage}
/>
