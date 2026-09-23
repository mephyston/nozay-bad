<script lang="ts">
  import { Badge, ListView, ListRow, moisEnToutesLettres } from '@nba/ui';
  import {
    candidaturesDeSoiree,
    detailDeSoiree,
    gestesDeSoiree,
    moisDeSoiree,
    pastilleDeSoiree,
    remplissageDeSoiree,
    titreDeSoiree,
    tonDeRemplissage,
    type DroitsSurSoirees,
    type GestesDeSoiree,
    type SoireeLike
  } from './indiv-row-model';

  /**
   * Les soirées d'indiv en liste, au doigt.
   *
   * La carte empilait le jour, l'horaire, le gymnase, deux décomptes, une pastille et
   * deux boutons pleine largeur. La ligne garde ce qu'on vient vérifier : quel soir,
   * où, et combien de places sont pourvues. L'appui mène aux candidats — c'est une
   * autre page, et c'est là que se fait le choix.
   */
  let {
    sessions = [],
    droits = {},
    selectionHref,
    aujourdhui,
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    sessions?: SoireeLike[];
    droits?: DroitsSurSoirees;
    /** Destination de l'appui : l'écran de sélection de cette soirée. */
    selectionHref: (id: number) => string;
    /** Le jour de référence, injecté : l'horloge de la suite de tests est figée. */
    aujourdhui: string;
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeSoiree = $props();
</script>

<ListView
  items={sessions}
  sections={moisDeSoiree}
  sectionLabel={moisEnToutesLettres}
  {emptyTitle}
  {emptyDescription}
>
  {#snippet listRow(soiree)}
    {@const pastille = pastilleDeSoiree(soiree, aujourdhui)}
    <ListRow
      item={soiree}
      href={selectionHref(soiree.id)}
      title={titreDeSoiree(soiree)}
      subtitle={detailDeSoiree(soiree)}
      value={remplissageDeSoiree(soiree)}
      valueTone={tonDeRemplissage(soiree)}
      valueCaption={candidaturesDeSoiree(soiree)}
      actions={gestesDeSoiree(soiree, droits, gestes)}
      class={soiree.status === 'cancelled' ? 'opacity-60' : undefined}
    >
      {#snippet badge()}
        {#if pastille}
          <Badge variant={pastille.variante} size="xs">{pastille.texte}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
