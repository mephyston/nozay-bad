<script lang="ts">
  import { Input, Label, Select, Checkbox } from '@nba/ui';
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

<div class="space-y-3">
  <div class="space-y-1.5">
    <Label for={`${uid}-feed-heading`}>Titre de section</Label>
    <Input id={`${uid}-feed-heading`} bind:value={block.heading} placeholder="Actualités du club" />
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
      <Label for={`${uid}-feed-limit`}>Nombre d'actualités</Label>
      <Select
        id={`${uid}-feed-limit`}
        value={String(block.limit)}
        onchange={(e) => (block.limit = Number((e.currentTarget as HTMLSelectElement).value))}
      >
        {#each [3, 6, 9, 12] as count}
          <option value={String(count)}>{count} actualités</option>
        {/each}
      </Select>
    </div>

    <div class="space-y-1.5">
      <Label for={`${uid}-feed-category`}>Catégorie</Label>
      <Select
        id={`${uid}-feed-category`}
        value={block.categorySlug ?? ''}
        onchange={(e) => {
          const value = (e.currentTarget as HTMLSelectElement).value;
          block.categorySlug = value === '' ? undefined : value;
        }}
      >
        <option value="">Toutes les catégories</option>
        {#each categories as category (category.slug)}
          <option value={category.slug}>{category.name}</option>
        {/each}
      </Select>
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Checkbox
      id={`${uid}-feed-images`}
      checked={block.showImages !== false}
      onCheckedChange={(checked) => (block.showImages = checked === true)}
    />
    <Label for={`${uid}-feed-images`} class="cursor-pointer font-normal">Afficher les images de couverture</Label>
  </div>

  <div class="flex items-center gap-2">
    <Checkbox
      id={`${uid}-feed-archive`}
      checked={block.showArchiveLink !== false}
      onCheckedChange={(checked) => (block.showArchiveLink = checked === true)}
    />
    <Label for={`${uid}-feed-archive`} class="cursor-pointer font-normal">
      Afficher le lien « Toutes les actualités »
    </Label>
  </div>
</div>
