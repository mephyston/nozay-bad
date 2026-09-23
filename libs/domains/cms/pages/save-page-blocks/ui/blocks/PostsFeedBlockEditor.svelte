<script lang="ts">
  import { ChoiceField, FormField, Input, SwitchField } from '@nba/ui';
  import type { PostsFeedBlock } from '../../../../shared/blocks';

  let { block = $bindable(), categories = [] } = $props<{
    block: PostsFeedBlock;
    categories?: { slug: string; name: string }[];
  }>();

  /**
   * Préfixe d'identifiants propre à cette instance.
   *
   * Un bloc peut désormais apparaître deux fois sur le même écran — au premier niveau
   * et dans une colonne, ou dans deux colonnes voisines. Des `id` écrits en dur s'y
   * répéteraient, et cliquer un intitulé donnerait le champ de l'autre bloc.
   */
  const uid = $props.id();
</script>

<div class="space-y-4">
  <FormField id={`${uid}-feed-heading`} label="Titre de section">
    <Input id={`${uid}-feed-heading`} bind:value={block.heading} placeholder="Actualités du club" />
  </FormField>

  <div class="grid gap-4 sm:grid-cols-2">
    <FormField id={`${uid}-feed-limit`} label="Nombre d'actualités">
      <ChoiceField
        id={`${uid}-feed-limit`}
        label="Nombre d'actualités"
        value={String(block.limit)}
        onChange={(v) => (block.limit = Number(v))}
        options={[3, 6, 9, 12].map((n) => ({ value: String(n), label: `${n} actualités` }))}
      />
    </FormField>

    <FormField id={`${uid}-feed-category`} label="Catégorie">
      <ChoiceField
        id={`${uid}-feed-category`}
        label="Catégorie"
        value={block.categorySlug ?? ''}
        onChange={(v) => (block.categorySlug = v === '' ? undefined : v)}
        options={[
          { value: '', label: 'Toutes les catégories' },
          ...categories.map((c: { slug: string; name: string }) => ({ value: c.slug, label: c.name }))
        ]}
      />
    </FormField>
  </div>

  <SwitchField
    id={`${uid}-feed-images`}
    label="Afficher les images de couverture"
    checked={block.showImages !== false}
    onChange={(v) => (block.showImages = v)}
  />

  <SwitchField
    id={`${uid}-feed-archive`}
    label="Afficher le lien « Toutes les actualités »"
    hint="Renvoie vers la page qui liste l'ensemble des actualités."
    checked={block.showArchiveLink !== false}
    onChange={(v) => (block.showArchiveLink = v)}
  />
</div>
