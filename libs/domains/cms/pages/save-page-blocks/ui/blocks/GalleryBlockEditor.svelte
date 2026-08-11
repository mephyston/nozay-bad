<script lang="ts">
  import { Input, Label, Button, Select } from '@nba/ui';
  import { mediaUrl } from '../../../../media/media-url';
  import { ImagePlus, X } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import type { GalleryBlock } from '../../../../shared/blocks';

  let { block = $bindable(), media = [], canUploadMedia = false } = $props<{
    block: GalleryBlock;
    /** Médiathèque de la page hôte : le bloc ne stocke que des identifiants. */
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
  }>();

  /** Plafond du schéma. Au-delà, ce n'est plus une galerie mais un album. */
  const MAX = 60;

  let pickerOpen = $state(false);

  /**
   * Identifiants résolus en médias, en conservant les inconnus.
   *
   * Un média retiré de la médiathèque laisse une entrée sans vignette plutôt que de
   * disparaître en silence : l'auteur voit qu'il manque quelque chose, et peut retirer
   * l'entrée lui-même. Le rendu public, lui, ignore déjà les identifiants morts.
   */
  const chosen = $derived(
    block.mediaIds.map((id: number) => ({
      id,
      media: media.find((item: PickableMedia) => item.id === id) ?? null
    }))
  );


  function add(item: PickableMedia) {
    // Le doublon serait retiré par l'API de toute façon ; l'écarter ici évite surtout
    // de laisser croire qu'il a été ajouté.
    if (block.mediaIds.includes(item.id) || block.mediaIds.length >= MAX) return;
    block.mediaIds = [...block.mediaIds, item.id];
  }

  function remove(index: number) {
    block.mediaIds = block.mediaIds.filter((_: number, i: number) => i !== index);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= block.mediaIds.length) return;
    const next = [...block.mediaIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    block.mediaIds = next;
  }
</script>

<div class="space-y-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
      <Label for="gallery-heading">Titre de section</Label>
      <Input id="gallery-heading" bind:value={block.heading} placeholder="Le tournoi 2026 en images" />
    </div>
    <div class="space-y-1.5">
      <Label for="gallery-columns">Images par rangée</Label>
      <Select
        id="gallery-columns"
        value={String(block.columns ?? 3)}
        onchange={(e) =>
          (block.columns = Number((e.currentTarget as HTMLSelectElement).value) as 1 | 2 | 3 | 4)}
      >
        <option value="1">1 — pleine largeur</option>
        <option value="2">2 — grandes</option>
        <option value="3">3 — moyennes</option>
        <option value="4">4 — petites</option>
      </Select>
      <p class="text-muted-foreground text-xs">
        C'est ce réglage qui décide de la taille des images. Sur téléphone, jamais plus de deux.
      </p>
    </div>
  </div>

  <div class="space-y-2">
    <Label>Images</Label>

    {#if chosen.length > 0}
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {#each chosen as entry, index (index)}
          <li class="border-border overflow-hidden rounded-lg border">
            <div class="bg-muted flex aspect-video items-center justify-center overflow-hidden">
              {#if entry.media}
                <img
                  src={mediaUrl(entry.media.key)}
                  alt={entry.media.alt}
                  loading="lazy"
                  class="h-full w-full object-cover"
                />
              {:else}
                <span class="text-muted-foreground px-2 text-center text-xs">
                  Image introuvable (n° {entry.id})
                </span>
              {/if}
            </div>
            <div class="flex items-center justify-between gap-1 px-1 py-1">
              <span class="min-w-0 flex-1 truncate px-1 text-xs">
                {entry.media?.alt || '(sans description)'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Déplacer avant"
                disabled={index === 0}
                onclick={() => move(index, index - 1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Déplacer après"
                disabled={index === chosen.length - 1}
                onclick={() => move(index, index + 1)}
              >
                ↓
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onclick={() => remove(index)}>
                <X class="h-4 w-4" />
                <span class="sr-only">Retirer cette image</span>
              </Button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}

    {#if block.mediaIds.length < MAX}
      <Button type="button" variant="outline" class="gap-1.5" onclick={() => (pickerOpen = true)}>
        <ImagePlus class="h-4 w-4" />
        Ajouter une image
      </Button>
    {:else}
      <p class="text-muted-foreground text-xs">Cette galerie a atteint {MAX} images.</p>
    {/if}

    {#if chosen.length === 0}
      <p class="text-muted-foreground text-xs">
        Les images s'affichent en grille, dans l'ordre choisi ici, toutes au même format.
      </p>
    {/if}
  </div>
</div>

<MediaPicker
  bind:open={pickerOpen}
  {media}
  canUpload={canUploadMedia}
  kind="image"
  title="Image à ajouter à la galerie"
  onSelect={add}
/>
