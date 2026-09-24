<script lang="ts">
  import { ListView, ListRow } from '@nba/ui';
  import { lignesDePrevision, type PointDePrevision } from './treasury-forecast-row-model';

  /**
   * Le prévisionnel de trésorerie, mois par mois, sur téléphone.
   *
   * Le tableau à six colonnes de montants ne tenait pas dans 390 px et vivait dans un
   * `overflow-x-auto`. Ici, une rangée par mois : le mois à gauche, le mouvement qu'on
   * y attend sous lui, et le total à droite. Le détail par compte reste au tableau,
   * au-dessus de 768 px.
   */
  let { forecast }: { forecast: PointDePrevision[] } = $props();

  const lignes = $derived(lignesDePrevision(forecast));
</script>

<ListView
  items={lignes}
  inset="grouped"
  emptyTitle="Aucune projection"
  emptyDescription="Le prévisionnel demande un budget et un historique de saisonnalité."
>
  {#snippet listRow(l)}
    <ListRow title={l.titre} subtitle={l.sousTitre} value={l.valeur} valueTone={l.ton} valueCaption={l.legende} />
  {/snippet}
</ListView>
