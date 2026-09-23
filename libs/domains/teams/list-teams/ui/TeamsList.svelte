<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import {
    detailDEquipe,
    effectifDEquipe,
    gestesDEquipe,
    legendeDEffectif,
    signalementsDEquipe,
    tonDEffectif,
    type DroitsSurEquipes,
    type EquipeLike,
    type GestesDEquipe
  } from './teams-row-model';

  /**
   * Les équipes engagées en liste, au doigt.
   *
   * La rangée faite main disait déjà l'essentiel, mais l'effectif y était noyé dans une
   * phrase — « D2 · 8 joueur(s) » — et les trois autres gestes n'existaient pas : il
   * fallait passer par le bureau pour voir les rencontres ou corriger une équipe.
   *
   * L'appui ouvre le staff et l'effectif, comme avant ; le reste passe au balayage.
   */
  let {
    equipes = [],
    droits = {},
    emptyIcon,
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    equipes?: EquipeLike[];
    droits?: DroitsSurEquipes;
    emptyIcon?: unknown;
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDEquipe = $props();
</script>

<ListView items={equipes} {emptyIcon} {emptyTitle} {emptyDescription}>
  {#snippet listRow(equipe)}
    <ListRow
      item={equipe}
      onclick={() => gestes.onRoster(equipe)}
      title={equipe.name}
      subtitle={detailDEquipe(equipe)}
      value={effectifDEquipe(equipe)}
      valueTone={tonDEffectif(equipe)}
      valueCaption={legendeDEffectif(equipe)}
      actions={gestesDEquipe(droits, gestes)}
      class={equipe.active ? undefined : 'opacity-60'}
    >
      {#snippet badge()}
        {#each signalementsDEquipe(equipe) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
