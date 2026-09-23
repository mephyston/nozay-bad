<script lang="ts">
  import { Input, Label, Button, ChoiceField, FormField, SwitchField } from '@nba/ui';
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

  /**
   * Préfixe d'identifiants propre à cette instance.
   *
   * Un bloc peut désormais apparaître deux fois sur le même écran — au premier niveau
   * et dans une colonne, ou dans deux colonnes voisines. Des `id` écrits en dur s'y
   * répéteraient, et cliquer un intitulé donnerait le champ de l'autre bloc.
   */
  const uid = $props.id();

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
  <div class="grid gap-4 sm:grid-cols-2">
    <FormField id={`${uid}-gallery-heading`} label="Titre de section">
      <Input id={`${uid}-gallery-heading`} bind:value={block.heading} placeholder="Le tournoi 2026 en images" />
    </FormField>

    <FormField
      id={`${uid}-gallery-layout`}
      label="Disposition"
      hint="En ruban, chaque image garde ses proportions : une photo en portrait donne une carte étroite, un panoramique une carte large, et aucune n'est recadrée."
    >
      <ChoiceField
        id={`${uid}-gallery-layout`}
        label="Disposition"
        value={block.layout ?? 'grid'}
        onChange={(v) => (block.layout = v as 'grid' | 'carousel')}
        options={[
          { value: 'grid', label: 'Grille', hint: "Toutes visibles d'un coup" },
          { value: 'carousel', label: 'Ruban', hint: 'Défilement horizontal' }
        ]}
      />
    </FormField>

    <!--
      Le réglage disparaît en ruban au lieu de s'y griser : un champ à demi effacé
      qu'on peut encore ouvrir promet un effet qu'il n'a pas.
    -->
    {#if block.layout !== 'carousel'}
      <FormField
        id={`${uid}-gallery-columns`}
        label="Images par rangée"
        hint="C'est ce réglage qui décide de la taille des images. Sur téléphone, jamais plus de deux."
      >
        <ChoiceField
          id={`${uid}-gallery-columns`}
          label="Images par rangée"
          value={String(block.columns ?? 3)}
          onChange={(v) => (block.columns = Number(v) as 1 | 2 | 3 | 4)}
          options={[
            { value: '1', label: '1', hint: 'Pleine largeur' },
            { value: '2', label: '2', hint: 'Grandes' },
            { value: '3', label: '3', hint: 'Moyennes' },
            { value: '4', label: '4', hint: 'Petites' }
          ]}
        />
      </FormField>
    {/if}
  </div>

  {#if block.layout === 'carousel'}
    <SwitchField
      id={`${uid}-gallery-autoscroll`}
      label="Faire défiler automatiquement"
      hint="Le ruban glisse de la droite vers la gauche. Il s'arrête au survol, et un bouton de pause reste disponible — le mouvement est désactivé d'office pour les visiteurs qui demandent moins d'animation."
      checked={block.autoScroll === true}
      onChange={(v) => (block.autoScroll = v)}
    />
  {/if}

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
      <Button type="button" variant="outline" class="w-full gap-1.5" onclick={() => (pickerOpen = true)}>
        <ImagePlus class="size-4" />
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
