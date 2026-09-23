<script lang="ts">
  import { Badge, ListRow, ListView } from '@nba/ui';
  import {
    codesDeCategorie,
    libelleAdherent,
    signalementsDeCategorie,
    tonDeCodes
  } from './config-row-model';
  import type { AccountClass, Category } from './settings-types';

  /**
   * Les catégories comptables en liste, au doigt.
   *
   * La carte empilait six champs — deux libellés, deux classes avec leurs intitulés en
   * capitales de dix pixels, deux pastilles dont « Actif » sur chaque ligne — puis un
   * bouton « Modifier » pleine largeur. On y lisait tout sauf ce qu'on vient vérifier :
   * à quelles classes comptables la catégorie renvoie.
   */
  let {
    categories = [],
    accountClasses = [],
    onEdit
  }: {
    categories?: Category[];
    accountClasses?: AccountClass[];
    onEdit: (cat: Category) => void;
  } = $props();
</script>

<ListView
  items={categories}
  emptyTitle="Aucune catégorie"
  emptyDescription="Aucune catégorie comptable n’est définie."
>
  {#snippet listRow(cat)}
    <ListRow
      item={cat}
      onclick={() => onEdit(cat)}
      title={cat.adminLabel}
      subtitle={libelleAdherent(cat)}
      value={codesDeCategorie(cat, accountClasses)}
      valueTone={tonDeCodes(cat)}
      valueCaption="recette / dépense"
    >
      {#snippet badge()}
        {#each signalementsDeCategorie(cat) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
