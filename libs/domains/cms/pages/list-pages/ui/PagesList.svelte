<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import {
    gestesDePage,
    ligneDePage,
    signalementsDePage,
    type DroitsSurPages,
    type GestesDePage,
    type PageLike
  } from './pages-row-model';

  /**
   * Les pages du site en liste, au doigt.
   *
   * La carte alignait le titre, l'adresse, deux blocs à droite et deux boutons pleine
   * largeur — dont « Supprimer » en rouge, aussi accessible que « Modifier », tandis
   * que « Voir sur le site » manquait. Le titre identifie, l'adresse situe, la date de
   * dernière modification tient la droite, et les trois gestes passent au balayage.
   */
  let {
    pages = [],
    droits = {},
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    pages?: PageLike[];
    droits?: DroitsSurPages;
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDePage = $props();
</script>

<ListView items={pages} {emptyTitle} {emptyDescription}>
  {#snippet listRow(page)}
    {@const l = ligneDePage(page)}
    <ListRow
      item={page}
      onclick={droits.canWrite ? () => gestes.onEdit(page) : undefined}
      chevron={droits.canWrite ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      valueCaption="modifiée"
      actions={gestesDePage(page, droits, gestes)}
    >
      {#snippet badge()}
        {#each signalementsDePage(page) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
