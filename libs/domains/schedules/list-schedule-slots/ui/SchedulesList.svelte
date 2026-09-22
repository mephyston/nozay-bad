<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import {
    gestesDeCreneau,
    libelleDeJour,
    ligneDeCreneau,
    signalementsDeCreneau,
    type CreneauLike,
    type GestesDeCreneau
  } from './schedules-row-model';

  /**
   * La semaine en liste, au doigt.
   *
   * Six colonnes devenaient une carte de quatre lignes suivie de trois boutons pleine
   * largeur — dont « Supprimer » en rouge, à portée du pouce au même titre que
   * « Modifier ». Le jour coiffe sa section au lieu de se répéter sur chaque rangée,
   * et les trois gestes passent au balayage.
   */
  let {
    creneaux = [],
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    creneaux?: CreneauLike[];
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeCreneau = $props();
</script>

<!--
  `plain` et non le `grouped` par défaut : sept jours font sept sections, et sept blocs
  arrondis encadraient chacun trois lignes — un cadre par jour, empilés sur toute la
  hauteur. Bord à bord, les en-têtes se collent en haut pendant qu'on défile et disent
  quel jour on lit, ce qu'un cadre ne fait pas.
-->
<ListView
  items={creneaux}
  inset="plain"
  sections={(slot) => String(slot.weekday)}
  sectionLabel={(cle) => libelleDeJour(Number(cle))}
  {emptyTitle}
  {emptyDescription}
>
  {#snippet listRow(slot)}
    {@const l = ligneDeCreneau(slot)}
    <ListRow
      item={slot}
      onclick={gestes.canWrite ? () => gestes.onEdit(slot) : undefined}
      chevron={gestes.canWrite ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      valueCaption={l.legende}
      actions={gestesDeCreneau(slot, gestes)}
    >
      {#snippet badge()}
        {#each signalementsDeCreneau(slot) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
