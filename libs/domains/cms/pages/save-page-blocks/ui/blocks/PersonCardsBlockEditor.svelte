<script lang="ts">
  import { Input, Button, FormField, Textarea } from '@nba/ui';
  import { ImagePlus, Plus, Trash2, X } from '@lucide/svelte';
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

  /* Identifiants uniques : deux blocs « personnes » sur la même page auraient sinon
     les mêmes, et un `<label for=…>` désignerait le champ de l'autre. */
  const uid = $props.id();

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
  <FormField id={`${uid}-people-heading`} label="Titre de section">
    <Input id={`${uid}-people-heading`} bind:value={block.heading} placeholder="Le bureau" />
  </FormField>

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

      <!-- Les cinq champs n'avaient que leur placeholder pour intitulé : au lecteur
           d'écran, cette carte annonçait cinq zones de saisie sans nom. -->
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField id={`${uid}-person-${index}-name`} label="Nom">
          <Input id={`${uid}-person-${index}-name`} bind:value={person.name} placeholder="Marie Dupont" />
        </FormField>
        <FormField id={`${uid}-person-${index}-role`} label="Fonction">
          <Input id={`${uid}-person-${index}-role`} bind:value={person.role} placeholder="Trésorière" />
        </FormField>
        <FormField id={`${uid}-person-${index}-email`} label="Adresse électronique">
          <Input
            id={`${uid}-person-${index}-email`}
            type="email"
            bind:value={person.email}
            placeholder="tresorerie@exemple.fr"
          />
        </FormField>
        <FormField id={`${uid}-person-${index}-phone`} label="Téléphone">
          <Input
            id={`${uid}-person-${index}-phone`}
            type="tel"
            bind:value={person.phone}
            placeholder="06 12 34 56 78"
          />
        </FormField>
      </div>

      <FormField
        id={`${uid}-person-${index}-responsibilities`}
        label="Responsabilités"
        hint="Une par ligne."
      >
        <Textarea
          id={`${uid}-person-${index}-responsibilities`}
          value={person.responsibilities.join('\n')}
          oninput={(e) => (person.responsibilities = (e.currentTarget as HTMLTextAreaElement).value.split('\n').filter(Boolean))}
          placeholder={'Comptabilité\nLicences'}
        />
      </FormField>

      <Button type="button" variant="ghost" class="w-full gap-1.5 text-destructive" onclick={() => remove(index)}>
        <Trash2 class="size-4" />
        Retirer cette personne
      </Button>
    </div>
  {/each}
  <!-- Le geste d'ajout prend toute la largeur et porte son signe : c'est la forme
       qu'ont désormais les mêmes boutons dans tous les blocs. -->
  <Button type="button" variant="outline" class="w-full gap-1.5" onclick={add}>
    <Plus class="size-4" />
    Ajouter une personne
  </Button>
</div>

<MediaPicker
  bind:open={pickerOpen}
  {media}
  kind="image"
  title="Photo de la personne"
  canUpload={canUploadMedia}
  onSelect={choosePortrait}
/>
