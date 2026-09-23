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
    reorganise = false,
    onReorder,
    emptyTitle = 'Menu vide',
    emptyDescription,
    ...gestes
  }: {
    arbre?: EntreeLike[];
    /** Fait apparaître les poignées et suspend l'appui sur la rangée. */
    reorganise?: boolean;
    onReorder?: (fratrie: EntreeLike[], de: number, vers: number) => void;
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeMenu = $props();

  /*
    La clé de fratrie : le premier niveau, ou les enfants d'un parent. C'est elle qui
    borne le glissement — une sous-entrée ne sort pas de son parent d'un geste, ce
    serait changer son parent et non son rang.
  */
  const fratrieDe = (r: { entree: EntreeLike; enfant: boolean }) =>
    r.enfant ? `parent-${r.entree.parentId}` : 'racine';

  function reordonner(groupe: string, de: number, vers: number) {
    const rangee = rangees.find((r) => fratrieDe(r) === groupe);
    if (rangee) onReorder?.(rangee.fratrie, de, vers);
  }

  const rangees = $derived(rangeesDeMenu(arbre));
</script>

<ListView items={rangees} onReorder={reordonner} {emptyTitle} {emptyDescription}>
  {#snippet listRow(rangee)}
    {@const l = ligneDEntree(rangee.entree)}
    <ListRow
      item={rangee.entree}
      nested={rangee.enfant}
      reorder={reorganise && rangee.fratrie.length > 1
        ? { groupe: fratrieDe(rangee), rang: rangee.rang }
        : undefined}
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
