<script lang="ts">
  import { Input, Label, Button, FormField, MediaField, Textarea } from '@nba/ui';
  import { mediaUrl } from '../../../../media/media-url';
  import { ImagePlus, Plus, Trash2 } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import type { CarouselBlock, CarouselSlideValue } from '../../../../shared/blocks';
  import LinkTargetField from './LinkTargetField.svelte';

  let {
    block = $bindable(),
    media = [],
    canUploadMedia = false,
    targets = []
  } = $props<{
    block: CarouselBlock;
    /** Médiathèque de la page hôte : le bloc ne stocke que des identifiants. */
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
    /** Pages et actualités du site, pour la cible du bouton d'une diapositive. */
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
  }>();

  /** Plafond du schéma. Au-delà, les dernières diapositives ne sont jamais vues. */
  const MAX = 12;

  /**
   * Un seul sélecteur de média pour tout le bloc, ouvert sur la diapositive visée.
   *
   * Un sélecteur par diapositive monterait douze feuilles latérales et douze copies de
   * la médiathèque dans le DOM pour n'en montrer qu'une.
   */
  let pickerOpen = $state(false);
  let pickerFor = $state(0);

  function openPicker(index: number) {
    pickerFor = index;
    pickerOpen = true;
  }


  /* Identifiants uniques : deux carrousels sur la même page auraient sinon les mêmes,
     et un `<label for=…>` désignerait le champ de l'autre. */
  const uid = $props.id();

  const imageOf = (slide: CarouselSlideValue) =>
    slide.mediaId ? (media.find((item: PickableMedia) => item.id === slide.mediaId) ?? null) : null;

  /*
    La nature du lien vit désormais dans le champ de cible, partagé avec la grille de
    liens et le bloc d'accroche : le même état et les mêmes deux fonctions étaient
    écrits ici mot pour mot.
  */

  /**
   * `ctaHref` doit être une chaîne, jamais `undefined`.
   *
   * `Combobox` déclare `value = $bindable('')`, donc une valeur de repli : Svelte
   * refuse alors `bind:value={undefined}` et **avorte le rendu du bloc**. À l'écran,
   * l'ajout d'une diapositive semblait alors sans effet — la donnée était bien
   * ajoutée, mais plus rien ne se redessinait.
   *
   * Deux chemins amènent l'absence de clé : une diapositive qu'on vient d'ajouter, et
   * une diapositive relue de la base, la normalisation retirant `ctaLabel`/`ctaHref`
   * quand il n'y a pas de bouton. On couvre le second ici, le premier dans `add()`.
   */
  for (const slide of block.slides as CarouselSlideValue[]) slide.ctaHref ??= '';

  function add() {
    if (block.slides.length >= MAX) return;
    // `ctaHref: ''` et non absent : voir la note sur `Combobox` plus haut.
    block.slides = [...block.slides, { mediaId: 0, title: '', ctaHref: '' }];
  }

  function remove(index: number) {
    block.slides = block.slides.filter((_: CarouselSlideValue, i: number) => i !== index);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= block.slides.length) return;
    const slides = [...block.slides];
    const [movedSlide] = slides.splice(from, 1);
    slides.splice(to, 0, movedSlide);
    block.slides = slides;
    /* La nature du lien voyage avec sa diapositive : elle appartient au champ de
       cible, qui la relit de l'adresse déplacée. Il n'y a plus de tableau parallèle
       à tenir en phase — c'était la seule raison de ce second `splice`. */
  }
</script>

<div class="space-y-4">
  <FormField id={`${uid}-carousel-heading`} label="Titre de section">
    <Input
      id={`${uid}-carousel-heading`}
      bind:value={block.heading}
      placeholder="Nos partenaires en action"
    />
  </FormField>

  <div class="space-y-3">
    <Label>Diapositives</Label>

    {#each block.slides as slide, index (index)}
      {@const image = imageOf(slide)}
      <div class="border-border space-y-3 rounded-md border p-3">
        <div class="flex items-center justify-between gap-1">
          <span class="text-muted-foreground text-xs font-medium">Diapositive {index + 1}</span>
          <div class="flex items-center gap-1">
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
              disabled={index === block.slides.length - 1}
              onclick={() => move(index, index + 1)}
            >
              ↓
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onclick={() => remove(index)}>
              <Trash2 class="h-4 w-4" />
              <span class="sr-only">Retirer cette diapositive</span>
            </Button>
          </div>
        </div>

        <!--
          La même rangée que l'image d'un produit : appui pour choisir, puis l'image
          sur sa propre ligne avec la pastille de retrait. Une diapositive n'en porte
          qu'une, d'où `max={1}` — la rangée dit « Remplacer » et non « Ajouter ».
        -->
        <FormField
          id={`${uid}-slide-${index}-media`}
          label="Image"
          hint={slide.mediaId && !image
            ? `Image introuvable (n° ${slide.mediaId}) : elle a été retirée de la médiathèque.`
            : "L'image occupe toute la largeur de la page, recadrée en bandeau. Préférez une image large et pas trop chargée : le titre et le bouton se posent devant, en bas à gauche."}
        >
          <MediaField
            id={`${uid}-slide-${index}-media`}
            label="Image"
            max={1}
            preview={image ? [mediaUrl(image.key)] : null}
            names={image ? [image.alt || 'Image de la diapositive'] : undefined}
            onBrowse={() => openPicker(index)}
            onClear={() => (block.slides[index].mediaId = 0)}
          />
        </FormField>

        <FormField id={`${uid}-slide-${index}-title`} label="Titre de la carte">
          <Input id={`${uid}-slide-${index}-title`} bind:value={slide.title} placeholder="Stage de Toussaint" />
        </FormField>

        <FormField id={`${uid}-slide-${index}-description`} label="Description" hint="Facultative.">
          <Textarea
            id={`${uid}-slide-${index}-description`}
            bind:value={slide.description}
            rows={2}
            placeholder="Une phrase sous le titre"
          />
        </FormField>

        <FormField id={`${uid}-slide-${index}-cta`} label="Libellé du bouton" hint="Facultatif.">
          <Input id={`${uid}-slide-${index}-cta`} bind:value={slide.ctaLabel} placeholder="En savoir plus" />
        </FormField>

        <LinkTargetField id={`${uid}-slide-${index}-target`} bind:href={slide.ctaHref} {targets} />
      </div>
    {/each}

    {#if block.slides.length < MAX}
      <Button type="button" variant="outline" class="w-full gap-1.5" onclick={add}>
        <Plus class="size-4" />
        Ajouter une diapositive
      </Button>
    {:else}
      <p class="text-muted-foreground text-xs">Ce carrousel a atteint {MAX} diapositives.</p>
    {/if}

    {#if block.slides.length === 0}
      <p class="text-muted-foreground text-xs">
        Les diapositives se succèdent en fondu, dans l'ordre choisi ici. Le défilement s'arrête au
        survol de la souris.
      </p>
    {/if}
  </div>
</div>

<MediaPicker
  bind:open={pickerOpen}
  {media}
  canUpload={canUploadMedia}
  kind="image"
  title="Image de la diapositive"
  onSelect={(item) => (block.slides[pickerFor].mediaId = item.id)}
/>
