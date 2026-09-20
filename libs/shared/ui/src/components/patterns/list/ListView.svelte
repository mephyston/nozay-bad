<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import EmptyState from '../EmptyState.svelte';
  import ListSection from './ListSection.svelte';
  import ListRowSkeleton from './ListRowSkeleton.svelte';
  import { cn } from '../../../lib/utils.js';
  import { swipeActions } from '../../../lib/actions/swipe-actions.js';

  let {
    items,
    listRow,
    sections,
    sectionLabel = (cle: string) => cle,
    inset = 'grouped',
    stickyHeaders,
    isLoading = false,
    skeletonRows = 6,
    skeletonLeading = false,
    emptyIcon,
    emptyTitle = 'Aucune donnée',
    emptyDescription = "Il n'y a rien à afficher pour le moment.",
    class: className
  }: {
    items: T[];
    /** Rend une `<ListRow>` par élément. */
    listRow: Snippet<[T, number]>;
    /** Clé de regroupement. Absente, la liste est plate. L'ordre d'apparition fait foi. */
    sections?: (item: T) => string;
    sectionLabel?: (cle: string) => string;
    /**
     * `grouped` — chaque section est un bloc arrondi précédé de son en-tête, le
     * fond de page transparaît entre les blocs. C'est la forme par défaut.
     * `plain` — lignes bord à bord, en-têtes collants.
     */
    inset?: 'grouped' | 'plain';
    stickyHeaders?: boolean;
    isLoading?: boolean;
    skeletonRows?: number;
    skeletonLeading?: boolean;
    emptyIcon?: any;
    emptyTitle?: string;
    emptyDescription?: string;
    class?: string;
  } = $props();

  // En `grouped`, le bloc de chaque section est arrondi donc clippé : un en-tête
  // collant s'y arrêterait au bord de la carte. Le collant appartient au `plain`.
  const collant = $derived(stickyHeaders ?? inset === 'plain');

  type Groupe = { cle: string; libelle: string; elements: { item: T; index: number }[] };

  const groupes = $derived.by((): Groupe[] => {
    if (!sections) {
      return [{ cle: '', libelle: '', elements: items.map((item, index) => ({ item, index })) }];
    }
    const par = new Map<string, Groupe>();
    items.forEach((item, index) => {
      const cle = sections(item);
      let groupe = par.get(cle);
      if (!groupe) {
        groupe = { cle, libelle: sectionLabel(cle), elements: [] };
        par.set(cle, groupe);
      }
      groupe.elements.push({ item, index });
    });
    return [...par.values()];
  });

  const classesListe = $derived(
    inset === 'grouped'
      ? 'divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'
      : 'divide-y divide-border border-y border-border bg-card'
  );
</script>

<div class={cn(sections ? 'space-y-5' : '', className)}>
  {#if isLoading}
    <ul class={classesListe}>
      {#each Array.from({ length: skeletonRows }), i (i)}
        <ListRowSkeleton withLeading={skeletonLeading} />
      {/each}
    </ul>
  {:else if items.length === 0}
    <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
  {:else}
    {#each groupes as groupe (groupe.cle)}
      <!-- L'en-tête et sa liste restent solidaires ; `space-y-5` ne sépare que les sections. -->
      <div class={sections ? 'space-y-1.5' : ''}>
        {#if sections}
          <ListSection label={groupe.libelle} sticky={collant} count={groupe.elements.length} />
        {/if}
        <!--
          Le balayage s'installe sur la liste, pas sur chaque ligne : quatre écouteurs
          au lieu de deux cents, et la ligne ouverte devient une variable locale.
          L'action se retire d'elle-même sur une ligne sans actions révélables.
        -->
        <ul class={classesListe} use:swipeActions>
          {#each groupe.elements as element (element.index)}
            {@render listRow(element.item, element.index)}
          {/each}
        </ul>
      </div>
    {/each}
  {/if}
</div>
