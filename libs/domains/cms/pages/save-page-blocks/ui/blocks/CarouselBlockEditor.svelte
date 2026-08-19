<script lang="ts">
  import { Input, Label, Button, Select, Combobox, Textarea, type ComboboxItem } from '@nba/ui';
  import { mediaUrl } from '../../../../media/media-url';
  import { ImagePlus, Trash2 } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import type { CarouselBlock, CarouselSlideValue } from '../../../../shared/blocks';

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


  const imageOf = (slide: CarouselSlideValue) =>
    slide.mediaId ? (media.find((item: PickableMedia) => item.id === slide.mediaId) ?? null) : null;

  const targetItems: ComboboxItem[] = $derived(
    targets.map((target) => ({
      value: target.path,
      label: target.title,
      description: `${target.kind === 'post' ? 'Actualité' : 'Page'} — ${target.path}`
    }))
  );

  /**
   * Nature du lien, en état local — même raisonnement que la grille de liens : le
   * schéma ne stocke qu'une adresse, donc on ne peut que la deviner à l'ouverture. La
   * redeviner à chaque rendu empêcherait de choisir « adresse extérieure » avant
   * d'avoir saisi quoi que ce soit, le champ vide étant aussitôt relu comme interne.
   */
  const looksExternal = (href: string) => /^https?:\/\//i.test(href);
  let modes = $state<('internal' | 'external')[]>(
    block.slides.map((slide: CarouselSlideValue) =>
      looksExternal(slide.ctaHref ?? '') ? 'external' : 'internal'
    )
  );

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

  function modeOf(index: number): 'internal' | 'external' {
    return modes[index] ?? (looksExternal(block.slides[index]?.ctaHref ?? '') ? 'external' : 'internal');
  }

  function setMode(index: number, mode: 'internal' | 'external') {
    modes[index] = mode;
    // Changer de nature vide l'adresse : laisser l'ancienne produirait un lien
    // silencieusement faux, un chemin interne étant lu comme une URL et l'inverse.
    block.slides[index].ctaHref = '';
  }

  function add() {
    if (block.slides.length >= MAX) return;
    // `ctaHref: ''` et non absent : voir la note sur `Combobox` plus haut.
    block.slides = [...block.slides, { mediaId: 0, title: '', ctaHref: '' }];
    modes = [...modes, 'internal'];
  }

  function remove(index: number) {
    block.slides = block.slides.filter((_: CarouselSlideValue, i: number) => i !== index);
    modes = modes.filter((_, i) => i !== index);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= block.slides.length) return;
    const slides = [...block.slides];
    const [movedSlide] = slides.splice(from, 1);
    slides.splice(to, 0, movedSlide);
    block.slides = slides;

    // Les natures suivent leur diapositive, sinon la ligne déplacée hériterait de
    // celle qui a pris sa place et son champ d'adresse changerait de forme.
    const nextModes = [...modes];
    const [movedMode] = nextModes.splice(from, 1);
    nextModes.splice(to, 0, movedMode);
    modes = nextModes;
  }
</script>

<div class="space-y-4">
  <div class="space-y-1.5">
    <Label for="carousel-heading">Titre de section</Label>
    <Input id="carousel-heading" bind:value={block.heading} placeholder="Nos partenaires en action" />
  </div>

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

        <div class="flex items-start gap-3">
          <div
            class="bg-muted flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded"
          >
            {#if image}
              <img
                src={mediaUrl(image.key)}
                alt={image.alt}
                loading="lazy"
                class="h-full w-full object-cover"
              />
            {:else if slide.mediaId}
              <span class="text-muted-foreground px-1 text-center text-xs">
                Introuvable (n° {slide.mediaId})
              </span>
            {/if}
          </div>
          <div class="min-w-0 flex-1 space-y-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="gap-1.5"
              onclick={() => openPicker(index)}
            >
              <ImagePlus class="h-4 w-4" />
              {image ? "Remplacer l'image" : 'Choisir une image'}
            </Button>
            <p class="text-muted-foreground text-xs">
              L'image occupe toute la largeur de la page, recadrée en bandeau. Préférez une image
              large et pas trop chargée : le titre et le bouton se posent devant, en bas à gauche.
            </p>
          </div>
        </div>

        <Input bind:value={slide.title} placeholder="Titre de la carte" />
        <Textarea bind:value={slide.description} rows={2} placeholder="Description courte (facultative)" />

        <div class="space-y-1.5">
          <Input bind:value={slide.ctaLabel} placeholder="Libellé du bouton (facultatif)" />
          <Select
            value={modeOf(index)}
            onchange={(e) =>
              setMode(index, (e.currentTarget as HTMLSelectElement).value as 'internal' | 'external')}
          >
            <option value="internal">Une page ou actualité du site</option>
            <option value="external">Une adresse extérieure</option>
          </Select>

          {#if modeOf(index) === 'external'}
            <Input bind:value={slide.ctaHref} placeholder="https://exemple.fr/…" />
          {:else if targetItems.length > 0}
            <Combobox
              items={targetItems}
              bind:value={slide.ctaHref}
              placeholder="Rechercher une page ou une actualité…"
              clearLabel="Aucune cible"
            />
          {:else}
            <Input bind:value={slide.ctaHref} placeholder="/notre-club/" />
          {/if}
        </div>
      </div>
    {/each}

    {#if block.slides.length < MAX}
      <Button type="button" variant="secondary" onclick={add}>Ajouter une diapositive</Button>
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
