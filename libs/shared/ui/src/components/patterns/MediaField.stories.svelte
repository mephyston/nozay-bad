<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { MediaField, FormField } from '@nba/ui';

  // Un damier encodé : la story ne dépend d'aucun fichier ni d'aucun réseau.
  const VIGNETTE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#c8553d"/><circle cx="60" cy="48" r="22" fill="#f5f4ee"/><rect x="24" y="78" width="72" height="18" rx="9" fill="#f5f4ee"/></svg>`
    );

  const { Story } = defineMeta({
    title: 'Patterns/MediaField',
    component: MediaField,
    tags: ['autodocs'],
  });
</script>

<Story name="Vide">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <FormField id="img-vide" label="Image">
        <MediaField
          id="img-vide"
          label="Image"
          hint="PNG, JPEG ou WebP, 8 Mo au plus."
          onSelect={() => {}}
        />
      </FormField>
    </div>
  {/snippet}
</Story>

<Story name="AvecUneImage">
  {#snippet template()}
    <!--
      La vignette vit sous la rangée, avec la pastille rouge au signe moins d'iOS :
      le retrait est posé sur ce qu'il supprime, et non dans la rangée, où deux
      cibles de 44 points dont une destructrice se toucheraient l'une pour l'autre.
    -->
    <div class="w-[390px] max-w-full">
      <FormField id="img-une" label="Image">
        <MediaField
          id="img-une"
          label="Image"
          preview={VIGNETTE}
          hint="PNG, JPEG ou WebP, 8 Mo au plus."
          onSelect={() => {}}
          onClear={() => {}}
        />
      </FormField>
    </div>
  {/snippet}
</Story>

<Story name="AvecPlusieursImages">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <FormField id="img-plus" label="Photos">
        <MediaField
          id="img-plus"
          label="Photos"
          preview={[VIGNETTE, VIGNETTE.replace('c8553d', '6b8f71'), VIGNETTE.replace('c8553d', '4a6fa5')]}
          onSelect={() => {}}
          onClear={() => {}}
        />
      </FormField>
    </div>
  {/snippet}
</Story>
