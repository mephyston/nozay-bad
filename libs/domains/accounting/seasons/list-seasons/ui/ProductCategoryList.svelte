<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Badge, ListRow, ListView, type SwipeAction } from '@nba/ui';
  import { rattachementDeProduit } from './config-row-model';
  import type { Category, ProductCategory } from './settings-types';

  /**
   * Les catégories de la boutique en liste, au doigt.
   *
   * Ce qu'on vient vérifier ici est le **rattachement comptable** : une catégorie de
   * produits qui n'en a pas ne se comptabilise nulle part. Il passe donc sous le nom,
   * en clair, plutôt que d'être un identifiant caché dans une carte.
   */
  let {
    productCategories = [],
    accountingCategories = [],
    onEdit,
    onDelete
  }: {
    productCategories?: ProductCategory[];
    accountingCategories?: Category[];
    onEdit: (cat: ProductCategory) => void;
    onDelete: (cat: ProductCategory) => void;
  } = $props();

  /*
    La suppression passe au balayage, et elle ne porte pas de question : l'écran en pose
    déjà une, et la sienne dit ce que la catégorie emporte. Elle reste la seule action —
    modifier est ce que fait l'appui sur la rangée, et le balayage ne le refait pas.
  */
  const gestes = (cat: ProductCategory): SwipeAction<ProductCategory>[] => [
    { id: 'supprimer', label: 'Supprimer', icon: Trash2, tone: 'destructive', run: () => onDelete(cat) }
  ];
</script>

<ListView
  items={productCategories}
  emptyTitle="Aucune catégorie"
  emptyDescription="La boutique n’a aucune catégorie de produits."
>
  {#snippet listRow(cat)}
    <ListRow
      item={cat}
      onclick={() => onEdit(cat)}
      title={cat.label}
      subtitle={rattachementDeProduit(cat, accountingCategories)}
      actions={gestes(cat)}
      class={cat.active ? undefined : 'opacity-60'}
    >
      {#snippet badge()}
        {#if !cat.active}
          <!-- Seule exception badgée : une catégorie inactive ne se propose plus à la vente. -->
          <Badge variant="destructive" size="xs">Inactive</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
