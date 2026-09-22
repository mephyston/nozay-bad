<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import {
    gestesDActualite,
    ligneDActualite,
    signalementsDActualite,
    type ActualiteLike,
    type DroitsSurActualites,
    type GestesDActualite
  } from './posts-row-model';

  /**
   * Les actualités en liste, au doigt.
   *
   * La carte alignait le titre, l'adresse, deux pastilles et la date dans un bloc de
   * quatre lignes, avec le menu replié dans un coin. Ici le titre identifie, l'adresse
   * situe, la date tient la droite, et les gestes se prennent au balayage — publier
   * d'abord, puisque c'est l'étape du parcours et qu'elle se défait.
   */
  let {
    posts = [],
    droits = {},
    ...gestes
  }: {
    posts?: ActualiteLike[];
    droits?: DroitsSurActualites;
  } & GestesDActualite = $props();
</script>

<ListView items={posts} emptyTitle="Aucune actualité">
  {#snippet listRow(row)}
    {@const l = ligneDActualite(row)}
    <ListRow
      item={row}
      onclick={droits.canWrite ? () => gestes.onEdit(row) : undefined}
      chevron={droits.canWrite ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      actions={gestesDActualite(row, droits, gestes)}
    >
      <!--
        Seuls les écarts s'affichent : sur 390 px, la pastille et le titre se disputent
        la même ligne, et c'est le titre qui cédait. Une actualité publique et publiée
        ne porte donc aucune pastille — sa date suffit à dire qu'elle est passée.
      -->
      {#snippet badge()}
        {#each signalementsDActualite(row, !!droits.canNotify) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
