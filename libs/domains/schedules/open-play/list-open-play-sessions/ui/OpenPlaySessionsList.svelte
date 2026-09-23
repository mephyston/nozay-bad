<script lang="ts">
  import { Badge, ListView, ListRow, moisEnToutesLettres } from '@nba/ui';
  import {
    detailDeSeance,
    gestePrincipal,
    gestesAuBalayage,
    moisDeSeance,
    ouvreurDeSeance,
    pastilleDeSeance,
    remplissageDeSeance,
    titreDeSeance,
    tonDeRemplissage,
    type DroitsSurSeances,
    type GestesDeSeance,
    type SeanceLike
  } from './open-play-row-model';

  /**
   * Les séances de jeu libre en liste, au doigt.
   *
   * La carte empilait le jour, l'horaire, le gymnase, le remplissage, une pastille et
   * deux boutons pleine largeur — de quoi tenir trois séances à l'écran d'un téléphone,
   * là où une saison en compte deux cents. La ligne garde ce qu'on vient vérifier : quel
   * jour, où, et si la séance a de quoi ouvrir.
   *
   * Les mois font des sections : sans elles, la liste est un ruban où l'on ne sait plus
   * à quelle hauteur de la saison on se trouve.
   */
  let {
    sessions = [],
    droits = {},
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    sessions?: SeanceLike[];
    droits?: DroitsSurSeances;
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeSeance = $props();

  /* L'appui ouvre le détail ; le balayage porte le reste. La règle vit dans le modèle,
     pas ici : c'est elle qui garantit qu'aucun geste n'est offert deux fois. */
  const principal = $derived(gestePrincipal(droits));

  const appuyer = (s: SeanceLike) => {
    if (principal === 'inscrits') gestes.onRegistrations(s);
    else if (principal === 'modifier') gestes.onEdit(s);
  };
</script>

<ListView
  items={sessions}
  sections={moisDeSeance}
  sectionLabel={moisEnToutesLettres}
  {emptyTitle}
  {emptyDescription}
>
  {#snippet listRow(seance)}
    {@const pastille = pastilleDeSeance(seance)}
    <ListRow
      item={seance}
      onclick={principal ? () => appuyer(seance) : undefined}
      title={titreDeSeance(seance)}
      subtitle={detailDeSeance(seance)}
      value={remplissageDeSeance(seance)}
      valueTone={tonDeRemplissage(seance)}
      valueCaption={ouvreurDeSeance(seance)}
      actions={gestesAuBalayage(seance, droits, gestes)}
      class={seance.status === 'cancelled' ? 'opacity-60' : undefined}
    >
      {#snippet badge()}
        {#if pastille}
          <Badge variant={pastille.variante} size="xs">{pastille.texte}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
