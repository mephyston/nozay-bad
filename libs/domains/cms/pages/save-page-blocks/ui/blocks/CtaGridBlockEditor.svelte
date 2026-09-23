<script lang="ts">
  import { Input, Label, Button, ChoiceField, FormField } from '@nba/ui';
  import { mediaUrl } from '../../../../media/media-url';
  import { ImagePlus, X, Trash2 } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import type { CtaGridBlock } from '../../../../shared/blocks';
  import LinkTargetField from './LinkTargetField.svelte';

  let {
    block = $bindable(),
    media = [],
    canUploadMedia = false,
    targets = []
  } = $props<{
    block: CtaGridBlock;
    /** Médiathèque de la page hôte : sert la bannière de fond. */
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
    /** Pages et actualités du site, pour la cible d'un lien interne. */
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
  }>();

  /**
   * Préfixe d'identifiants propre à cette instance.
   *
   * Un bloc peut désormais apparaître deux fois sur le même écran — au premier niveau
   * et dans une colonne, ou dans deux colonnes voisines. Des `id` écrits en dur s'y
   * répéteraient, et cliquer un intitulé donnerait le champ de l'autre bloc.
   */
  const uid = $props.id();

  let backgroundPickerOpen = $state(false);

  const background = $derived(
    block.backgroundMediaId
      ? media.find((m: PickableMedia) => m.id === block.backgroundMediaId) ?? null
      : null
  );

  /*
    La nature du lien — page du site ou adresse extérieure — appartient désormais au
    champ de cible, qui la devine de l'adresse et la retient dès qu'on en choisit une.
    Elle était ici en triple : le même état, les mêmes deux fonctions et la même liste
    native vivaient aussi dans le carrousel, et manquaient au bloc d'accroche.
  */
  function add() {
    block.items = [...block.items, { label: '', href: '' }];
  }

  function remove(index: number) {
    block.items = block.items.filter((_: unknown, i: number) => i !== index);
  }
</script>

<div class="space-y-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <FormField id={`${uid}-grid-heading`} label="Titre de section">
      <Input id={`${uid}-grid-heading`} bind:value={block.heading} />
    </FormField>
    <FormField id={`${uid}-grid-columns`} label="Colonnes">
      <ChoiceField
        id={`${uid}-grid-columns`}
        label="Colonnes"
        value={String(block.columns)}
        onChange={(v) => (block.columns = Number(v) as 2 | 3 | 4)}
        options={[
          { value: '2', label: '2 colonnes' },
          { value: '3', label: '3 colonnes' },
          { value: '4', label: '4 colonnes' }
        ]}
      />
    </FormField>
  </div>

  <div class="space-y-1.5">
    <Label>Image de fond (bannière)</Label>
    {#if background}
      <div class="border-border flex items-center gap-3 rounded-md border p-2">
        <img
          src={mediaUrl(background.key)}
          alt={background.alt}
          class="h-16 w-28 shrink-0 rounded object-cover"
        />
        <span class="min-w-0 flex-1 truncate text-sm">{background.alt || '(sans description)'}</span>
        <Button type="button" variant="ghost" size="sm" onclick={() => (backgroundPickerOpen = true)}>
          Remplacer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onclick={() => (block.backgroundMediaId = undefined)}
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Retirer l'image de fond</span>
        </Button>
      </div>
    {:else}
      <Button type="button" variant="outline" class="gap-1.5" onclick={() => (backgroundPickerOpen = true)}>
        <ImagePlus class="h-4 w-4" />
        Choisir une image
      </Button>
      <p class="text-muted-foreground text-xs">
        Sans image, la grille s'affiche sur fond neutre. Avec, les boutons se posent devant la bannière.
      </p>
    {/if}
  </div>

  <div class="space-y-3">
    <Label>Boutons</Label>
    {#each block.items as item, index (index)}
      <div class="border-border space-y-2 rounded-md border p-3">
        <div class="flex items-center gap-2">
          <div class="flex-1">
            <FormField id={`cta-${uid}-${index}-label`} label="Libellé du bouton">
              <Input
                id={`cta-${uid}-${index}-label`}
                bind:value={item.label}
                placeholder="Nos créneaux"
              />
            </FormField>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onclick={() => remove(index)}>
            <Trash2 class="h-4 w-4" />
            <span class="sr-only">Retirer ce bouton</span>
          </Button>
        </div>

        <LinkTargetField id={`cta-${uid}-${index}-target`} bind:href={item.href} {targets} />

        <FormField
          id={`cta-${uid}-${index}-description`}
          label="Description"
          hint="Facultative : une ligne sous le libellé du bouton."
        >
          <Input
            id={`cta-${uid}-${index}-description`}
            bind:value={item.description}
            placeholder="Horaires, tarifs, inscriptions"
          />
        </FormField>
      </div>
    {/each}
    <Button type="button" variant="secondary" onclick={add}>Ajouter un bouton</Button>
  </div>
</div>

<MediaPicker
  bind:open={backgroundPickerOpen}
  {media}
  canUpload={canUploadMedia}
  kind="image"
  title="Image de fond de la bannière"
  onSelect={(item) => (block.backgroundMediaId = item.id)}
/>
