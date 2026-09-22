<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import {
    gestesDEvenement,
    libelleDeMois,
    ligneDEvenement,
    moisDe,
    signalementsDEvenement,
    type DroitsSurEvenements,
    type EvenementLike,
    type GestesDEvenement
  } from './events-row-model';

  /**
   * L'agenda en liste, au doigt.
   *
   * Sept colonnes devenaient une carte de quatre lignes suivie de jusqu'à cinq boutons
   * qui passaient à la ligne. Le mois coiffe désormais sa section, le titre identifie,
   * la date et le lieu situent, et le nombre d'inscrits tient la droite — deux colonnes
   * du tableau lui étaient consacrées.
   */
  let {
    evenements = [],
    droits = {},
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    evenements?: EvenementLike[];
    droits?: DroitsSurEvenements;
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDEvenement = $props();
</script>

<ListView
  items={evenements}
  sections={moisDe}
  sectionLabel={libelleDeMois}
  {emptyTitle}
  {emptyDescription}
>
  {#snippet listRow(e)}
    {@const l = ligneDEvenement(e)}
    <ListRow
      item={e}
      onclick={droits.canWrite ? () => gestes.onEdit(e) : undefined}
      chevron={droits.canWrite ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      valueCaption={l.legende}
      actions={gestesDEvenement(e, droits, gestes)}
    >
      {#snippet badge()}
        {#each signalementsDEvenement(e) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
