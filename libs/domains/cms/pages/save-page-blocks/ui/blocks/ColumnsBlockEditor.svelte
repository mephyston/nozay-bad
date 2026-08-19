<script lang="ts">
  import { Button, Input, Label, Select, RichTextEditor } from '@nba/ui';
  import { Plus, Trash2, ImagePlus, X } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import { mediaUrl, websiteOrigin } from '../../../../media/media-url';
  import { NESTABLE_BLOCK_TYPES, isBlockColumn } from '../../../../shared/blocks';
  import type { ColumnsBlock, ColumnValue, NestableBlockType } from '../../../../shared/blocks';
  import { BLOCK_KINDS, labelOf } from '../block-editor-registry';

  import PostsFeedBlockEditor from './PostsFeedBlockEditor.svelte';
  import EventsBlockEditor from './EventsBlockEditor.svelte';
  import ScheduleBlockEditor from './ScheduleBlockEditor.svelte';
  import GalleryBlockEditor from './GalleryBlockEditor.svelte';
  import PdfLinkBlockEditor from './PdfLinkBlockEditor.svelte';
  import CtaGridBlockEditor from './CtaGridBlockEditor.svelte';

  /**
   * Contenus côte à côte.
   *
   * Remplace les tableaux de mise en page de l'ancien site — `<td width="45%">` —, qui
   * restaient côte à côte jusque sur un téléphone. Ici la grille se replie en pile
   * sous 768 px, sans que le rédacteur n'ait rien à faire.
   *
   * Une colonne porte du texte, ou un bloc. Les éditeurs des blocs imbriquables sont
   * importés un par un plutôt que par `BlockCard` : celui-ci rend déjà ce composant, et
   * le rappeler d'ici fermerait un cycle d'imports.
   */
  let {
    block = $bindable(),
    media = [],
    canUploadMedia = false,
    targets = [],
    categories = []
  } = $props<{
    block: ColumnsBlock;
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
    /** Pages et actualités du site, proposées à l'insertion d'un lien interne. */
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
    /** Catégories d'actualités, pour un bloc « Actualités » imbriqué. */
    categories?: { slug: string; name: string }[];
  }>();

  const uid = $props.id();

  const linkSuggestions = $derived(
    targets.map((target: { path: string; title: string; status?: string }) => ({
      href: target.path,
      label: target.title,
      hint: target.status === 'draft' ? 'Brouillon' : 'Publié'
    }))
  );

  /**
   * Choix offerts pour le contenu d'une colonne.
   *
   * Les libellés et les charges de départ viennent du catalogue des blocs : les valeurs
   * par défaut restent à un seul endroit, et un bloc renommé l'est partout.
   */
  const CONTENT_KINDS = BLOCK_KINDS.filter((kind) =>
    NESTABLE_BLOCK_TYPES.includes(kind.type as NestableBlockType)
  );

  const kindOf = (column: ColumnValue): string =>
    isBlockColumn(column) ? column.block.type : 'text';

  /**
   * Bascule le contenu d'une colonne.
   *
   * Le contenu précédent est perdu, et c'est assumé : il n'y a rien de sensé à
   * transporter d'un agenda vers un tableau de créneaux. Le texte, lui, se retrouve
   * dans l'historique des révisions comme n'importe quel enregistrement.
   */
  function changeKind(index: number, kind: string) {
    if (kind === kindOf(block.items[index])) return;
    if (kind === 'text') {
      block.items[index] = { html: '<p></p>' };
      return;
    }
    const created = BLOCK_KINDS.find((k) => k.type === kind)?.create();
    if (created) block.items[index] = { block: created };
  }

  function addColumn() {
    if (block.items.length >= 3) return;
    block.items = [...block.items, { html: '<p></p>' }];
    // Trois colonnes sont toujours égales : le réglage n'aurait plus d'effet, et la
    // normalisation l'efface de toute façon à l'enregistrement.
    block.ratio = undefined;
  }

  function removeColumn(index: number) {
    // Deux au minimum : en dessous, ce n'est plus une mise en colonnes mais un bloc
    // de texte, et le schéma le refuserait à l'enregistrement.
    if (block.items.length <= 2) return;
    block.items = block.items.filter((_: unknown, i: number) => i !== index);
  }

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

  function openPicker(index: number) {
    pickingFor = index;
    pickerOpen = true;
  }

  function chooseImage(item: PickableMedia) {
    if (pickingFor === null) return;
    const column = block.items[pickingFor];
    if (!isBlockColumn(column)) column.mediaId = item.id;
    pickingFor = null;
    pickerOpen = false;
  }
</script>

<div class="space-y-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
      <Label for={`${uid}-columns-heading`}>Titre (facultatif)</Label>
      <Input
        id={`${uid}-columns-heading`}
        bind:value={block.heading}
        placeholder="Titre affiché au-dessus des colonnes"
        maxlength={160}
      />
    </div>

    {#if block.items.length === 2}
      <div class="space-y-1.5">
        <Label for={`${uid}-columns-ratio`}>Largeur des colonnes</Label>
        <Select
          id={`${uid}-columns-ratio`}
          value={block.ratio ?? 'equal'}
          onchange={(e) => (block.ratio = (e.currentTarget as HTMLSelectElement).value as ColumnsBlock['ratio'])}
        >
          <option value="equal">Colonnes égales</option>
          <option value="wide-first">Première colonne large (deux tiers)</option>
          <option value="wide-last">Dernière colonne large (deux tiers)</option>
        </Select>
        <p class="text-muted-foreground text-xs">
          Pour poser les actualités sur deux tiers de la page et l'agenda sur le dernier
          tiers, choisissez « Première colonne large ».
        </p>
      </div>
    {/if}
  </div>

  <div class="grid gap-3 md:grid-cols-2">
    {#each block.items as column, index (index)}
      <div class="border-border space-y-2 rounded-lg border p-3">
        <div class="flex items-center justify-between gap-2">
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

        <div class="space-y-1.5">
          <Label for={`${uid}-columns-kind-${index}`}>Contenu de la colonne</Label>
          <Select
            id={`${uid}-columns-kind-${index}`}
            value={kindOf(column)}
            onchange={(e) => changeKind(index, (e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="text">Texte</option>
            {#each CONTENT_KINDS as kind (kind.type)}
              <option value={kind.type}>{kind.label}</option>
            {/each}
          </Select>
        </div>

        {#if isBlockColumn(column)}
          <div class="border-border space-y-2 rounded-md border border-dashed p-3">
            <p class="text-muted-foreground text-xs">{labelOf(column.block.type)}</p>
            {#if column.block.type === 'posts_feed'}
              <PostsFeedBlockEditor bind:block={block.items[index].block} {categories} />
            {:else if column.block.type === 'events'}
              <EventsBlockEditor bind:block={block.items[index].block} />
            {:else if column.block.type === 'schedule'}
              <ScheduleBlockEditor bind:block={block.items[index].block} />
            {:else if column.block.type === 'gallery'}
              <GalleryBlockEditor bind:block={block.items[index].block} {media} {canUploadMedia} />
            {:else if column.block.type === 'pdf_link'}
              <PdfLinkBlockEditor bind:block={block.items[index].block} {media} {canUploadMedia} />
            {:else if column.block.type === 'cta_grid'}
              <CtaGridBlockEditor bind:block={block.items[index].block} {media} {canUploadMedia} {targets} />
            {/if}
          </div>
        {:else}
          {@const image = imageOf(column.mediaId)}
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
        {/if}
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
