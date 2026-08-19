<script lang="ts">
  import { Input, Label, Button, Textarea } from '@nba/ui';
  import { ImagePlus, X } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import { mediaUrl } from '../../../../media/media-url';
  import type { PersonCardsBlock } from '../../../../shared/blocks';

  let {
    block = $bindable(),
    media = [],
    canUploadMedia = false
  } = $props<{
    block: PersonCardsBlock;
    /** Médiathèque de la page hôte : sert les portraits. */
    media?: PickableMedia[];
    /** `cms:media:write` : autorise le dépôt depuis le sélecteur. */
    canUploadMedia?: boolean;
  }>();

  /**
   * Personne dont le sélecteur d'image est ouvert.
   *
   * Même montage que la mise en colonnes : l'ouverture est un état à part, et lié,
   * parce que `MediaPicker` referme lui-même son panneau en écrivant dans `open`. La
   * déduire de `pickingFor` rouvrirait le panneau aussitôt refermé.
   */
  let pickingFor = $state<number | null>(null);
  let pickerOpen = $state(false);

  const portraitOf = (mediaId?: number) =>
    mediaId ? media.find((item: PickableMedia) => item.id === mediaId) ?? null : null;

  function openPicker(index: number) {
    pickingFor = index;
    pickerOpen = true;
  }

  function choosePortrait(item: PickableMedia) {
    if (pickingFor === null) return;
    block.people[pickingFor].mediaId = item.id;
    pickingFor = null;
    pickerOpen = false;
  }

  function add() {
    block.people = [...block.people, { name: '', role: '', responsibilities: [] }];
  }
  function remove(index: number) {
    block.people = block.people.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-3">
  <div>
    <Label for="people-heading">Titre de section</Label>
    <Input id="people-heading" bind:value={block.heading} placeholder="Le bureau" />
  </div>

  {#each block.people as person, index (index)}
    {@const portrait = portraitOf(person.mediaId)}
    <div class="border-border space-y-2 rounded-lg border p-3">
      <div class="flex items-start gap-3">
        {#if portrait}
          <img
            src={mediaUrl(portrait.key)}
            alt={portrait.alt}
            class="border-border h-16 w-16 shrink-0 rounded-full border object-cover"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="gap-1.5"
            onclick={() => (block.people[index].mediaId = undefined)}
          >
            <X class="h-4 w-4" />
            Retirer la photo
          </Button>
        {:else}
          <!--
            Le gabarit rond est montré dès l'emplacement vide : le recadrage du site est
            circulaire, et une photo choisie sur sa vignette carrée se retrouve sinon
            rognée aux oreilles sans que le rédacteur l'ait vu venir.
          -->
          <div
            class="border-border text-muted-foreground flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed"
            aria-hidden="true"
          >
            <ImagePlus class="h-5 w-5" />
          </div>
          <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={() => openPicker(index)}>
            <ImagePlus class="h-4 w-4" />
            Ajouter une photo
          </Button>
        {/if}
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <Input bind:value={person.name} placeholder="Nom" />
        <Input bind:value={person.role} placeholder="Fonction" />
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        <Input bind:value={person.email} placeholder="Adresse électronique" />
        <Input bind:value={person.phone} placeholder="Téléphone" />
      </div>
      <Textarea
        value={person.responsibilities.join('\n')}
        oninput={(e) => (person.responsibilities = (e.currentTarget as HTMLTextAreaElement).value.split('\n').filter(Boolean))}
        placeholder="Une responsabilité par ligne"
      />
      <Button variant="ghost" onclick={() => remove(index)}>Retirer cette personne</Button>
    </div>
  {/each}
  <Button variant="secondary" onclick={add}>Ajouter une personne</Button>
</div>

<MediaPicker
  bind:open={pickerOpen}
  {media}
  kind="image"
  title="Photo de la personne"
  canUpload={canUploadMedia}
  onSelect={choosePortrait}
/>
