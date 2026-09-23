<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import {
    gestesDeRedirection,
    ligneDeRedirection,
    signalementsDeRedirection,
    type GestesDeRedirection,
    type RedirectionLike
  } from './redirects-row-model';

  /**
   * Les redirections en liste, au doigt.
   *
   * Sept colonnes devenaient une carte portant deux boutons pleine largeur **et** un
   * bouton de dépliage pour lire l'adresse en entier — trois affordances par rangée.
   * L'ancienne adresse identifie, la cible situe, le nombre de visites tient la droite,
   * et les deux gestes passent au balayage.
   */
  let {
    redirections = [],
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    redirections?: RedirectionLike[];
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeRedirection = $props();

  /*
    La tranche visible est décidée par l'écran, pas ici : `DataTable` porte déjà le
    bouton « Afficher les suivants » dans son pied, sous `md` seulement, et garde la
    pagination numérotée au bureau. En la refaisant ici, on obtenait les deux à la
    fois sur téléphone.
  */
</script>

<ListView items={redirections} {emptyTitle} {emptyDescription}>
  {#snippet listRow(r)}
    {@const l = ligneDeRedirection(r)}
    <ListRow
      item={r}
      onclick={gestes.canWrite ? () => gestes.onEdit(r) : undefined}
      chevron={gestes.canWrite ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      valueCaption={l.legende}
      actions={gestesDeRedirection(r, gestes)}
    >
      {#snippet badge()}
        {#each signalementsDeRedirection(r) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
