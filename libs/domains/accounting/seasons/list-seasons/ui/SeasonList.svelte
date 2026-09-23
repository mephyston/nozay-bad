<script lang="ts">
  import { Badge, ListRow, ListView, type SwipeAction } from '@nba/ui';
  import { gestesDExercice, signalementsDExercice, type GestesDExercice } from './config-row-model';
  import type { Season } from './settings-types';

  /**
   * Les exercices comptables en liste, au doigt.
   *
   * La carte empilait le nom, une pastille, puis deux ou trois boutons pleine largeur —
   * « Activer », « Soldes », « Clôturer » — dont un rouge, aussi accessible que les
   * autres. L'appui ouvre les soldes, qui est ce qu'on vient consulter ; le reste passe
   * au balayage, et la clôture y est la dernière.
   */
  let {
    seasons = [],
    ...gestes
  }: { seasons?: Season[] } & GestesDExercice = $props();

  const balayage = (s: Season): SwipeAction<Season>[] =>
    gestesDExercice(s, gestes)
      // L'appui ouvre déjà les soldes : le balayage ne refait pas ce que fait le doigt.
      .filter((a) => a.id !== 'soldes')
      .map((a) => ({ id: a.id, label: a.label, tone: a.tone, run: a.run }));
</script>

<ListView
  items={seasons}
  emptyTitle="Aucun exercice"
  emptyDescription="Ouvrez le premier exercice comptable du club."
>
  {#snippet listRow(saison)}
    <!-- Pas de sous-titre « Clos » : la pastille le dit, et deux fois vaut moins qu'une. -->
    <ListRow
      item={saison}
      onclick={() => gestes.onSoldes(saison.id)}
      title={saison.name}
      actions={balayage(saison)}
      class={saison.closed ? 'opacity-60' : undefined}
    >
      {#snippet badge()}
        {#each signalementsDExercice(saison) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
