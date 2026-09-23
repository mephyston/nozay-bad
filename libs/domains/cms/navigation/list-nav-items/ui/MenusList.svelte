<script lang="ts">
  import { ExternalLink } from '@lucide/svelte';
  import { ListView, ListRow } from '@nba/ui';
  import {
    gestesDEntree,
    ligneDEntree,
    rangeesDeMenu,
    type EntreeLike,
    type GestesDeMenu
  } from './menus-row-model';

  /**
   * Un menu du site, en liste.
   *
   * L'arbre était rendu à la main, chaque rangée portant deux flèches de 32 px et un
   * menu « … » — trois affordances là où la règle en veut une. Les sous-entrées se
   * distinguent par leur retrait, et les cinq gestes passent au balayage.
   */
  let {
    arbre = [],
    emptyTitle = 'Menu vide',
    emptyDescription,
    ...gestes
  }: {
    arbre?: EntreeLike[];
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeMenu = $props();

  const rangees = $derived(rangeesDeMenu(arbre));
</script>

<ListView items={rangees} {emptyTitle} {emptyDescription}>
  {#snippet listRow(rangee)}
    {@const l = ligneDEntree(rangee.entree)}
    <ListRow
      item={rangee.entree}
      nested={rangee.enfant}
      onclick={gestes.canWrite ? () => gestes.onEdit(rangee.entree) : undefined}
      chevron={gestes.canWrite ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      valueTone={l.ton}
      actions={gestesDEntree(rangee, gestes)}
    >
      {#snippet leading()}
        <!-- Seule l'adresse extérieure se signale : elle quitte le site, ce que le
             visiteur ne devine pas d'un intitulé. -->
        {#if rangee.entree.externalUrl}
          <ExternalLink class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
