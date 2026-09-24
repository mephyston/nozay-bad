<script lang="ts">
  import { ListView, ListRow } from '@nba/ui';
  import { lignesDePyramide, sommeDe, type CategorieDAge } from '../lib/dashboard-rows';

  /**
   * La pyramide des âges, sur téléphone.
   *
   * Cinq colonnes — catégorie, années de naissance, F, H, total — ne tiennent pas dans
   * 390 px : le tableau vivait dans un `overflow-x-auto`, et l'on ne voyait jamais le
   * total sans pousser l'écran de côté. Une rangée par catégorie : le nom à gauche, la
   * répartition sous lui, l'effectif à droite ; les jeunes et les adultes en sections,
   * chacune portant son sous-total dans son en-tête.
   */
  let { ages = [] }: { ages: CategorieDAge[] } = $props();

  const lignes = $derived(lignesDePyramide(ages));

  const sousTotaux = $derived({
    Jeunes: sommeDe(ages.filter((r) => r.youth)),
    Adultes: sommeDe(ages.filter((r) => !r.youth))
  });
</script>

<ListView
  items={lignes}
  sections={(l) => l.section}
  sectionValue={(cle) => String(sousTotaux[cle as 'Jeunes' | 'Adultes']?.total ?? 0)}
  emptyTitle="Aucun effectif"
  emptyDescription="Aucune catégorie d'âge n'est renseignée pour cette saison."
>
  {#snippet listRow(l)}
    <ListRow title={l.titre} subtitle={l.sousTitre} value={l.valeur} valueTone="foreground" />
  {/snippet}
</ListView>
