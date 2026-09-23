<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import {
    legendeDeComposition,
    lignesDeComposition,
    pastilleDeComposition,
    tonDeComposition,
    type EquipeDeJourneeLike
  } from './day-values-row-model';

  /**
   * Le contrôle d'une journée en liste, au doigt.
   *
   * Le tableau à sept colonnes défilait horizontalement : sa moitié droite — celle qui
   * porte le statut — ne se voyait jamais sur un téléphone, alors que c'est ce qu'on
   * vient chercher. Ici l'équipe identifie, la division situe, les lignes composées
   * tiennent la droite, et le statut se badge quand il réclame un geste.
   */
  let {
    equipes = [],
    avecValeur = false
  }: {
    equipes?: EquipeDeJourneeLike[];
    /** Le championnat définit-il une valeur d'équipe ? Sinon, rien à afficher dessous. */
    avecValeur?: boolean;
  } = $props();
</script>

<ListView
  items={equipes}
  emptyTitle="Aucune équipe"
  emptyDescription="Aucune équipe engagée dans ce championnat."
>
  {#snippet listRow(equipe)}
    {@const pastille = pastilleDeComposition(equipe)}
    <ListRow
      item={equipe}
      title={equipe.name}
      subtitle={equipe.divisionLabel}
      value={lignesDeComposition(equipe)}
      valueTone={tonDeComposition(equipe)}
      valueCaption={legendeDeComposition(equipe, avecValeur)}
    >
      {#snippet badge()}
        {#if pastille}
          <Badge variant={pastille.variante} size="xs">{pastille.texte}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
