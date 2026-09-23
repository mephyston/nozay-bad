<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import EmptyState from '../EmptyState.svelte';
  import ListSection from './ListSection.svelte';
  import ListRowSkeleton from './ListRowSkeleton.svelte';
  import { cn } from '../../../lib/utils.js';
  import { swipeActions } from '../../../lib/actions/swipe-actions.js';
  import { longPress } from '../../../lib/actions/long-press.js';
  import { reorderable } from '../../../lib/actions/reorder.js';

  let {
    items,
    listRow,
    sections,
    sectionLabel = (cle: string) => cle,
    sectionValue,
    inset = 'grouped',
    stickyHeaders,
    onReorder,
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
     * L'agrégat affiché à droite de l'en-tête, à la place du compte : un total, un
     * solde de fin de mois. Reçoit la clé de section.
     */
    sectionValue?: (cle: string) => string | undefined;
    /**
     * `grouped` — chaque section est un bloc arrondi précédé de son en-tête, le
     * fond de page transparaît entre les blocs. C'est la forme par défaut.
     * `plain` — lignes bord à bord, en-têtes collants.
     */
    inset?: 'grouped' | 'plain';
    stickyHeaders?: boolean;
    /**
     * Rend la liste réordonnable à la poignée. Reçoit la fratrie touchée et les deux
     * rangs. Chaque `ListRow` doit porter sa prop `reorder` pour que le geste ait une
     * prise ; sans elle, la liste reste ordinaire.
     */
    onReorder?: (groupe: string, de: number, vers: number) => void;
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

  /*
    Le bloc groupé se détache par son fond, pas par un trait.
    
    La bordure allait bien à une liste d'un seul tenant ; dès qu'il y a des sections,
    elle en dessine une par groupe — sept cadres empilés pour une semaine de créneaux,
    douze pour une année d'agenda. Le fond de carte suffit à séparer le bloc de la
    page, et c'est ce que fait iOS depuis qu'il a abandonné les filets.
  */
  const classesListe = $derived(
    inset === 'grouped'
      ? 'divide-y divide-border overflow-hidden rounded-xl bg-card'
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
          <ListSection
            label={groupe.libelle}
            sticky={collant}
            count={groupe.elements.length}
            value={sectionValue?.(groupe.cle)}
          />
        {/if}
        <!--
          Le balayage s'installe sur la liste, pas sur chaque ligne : quatre écouteurs
          au lieu de deux cents, et la ligne ouverte devient une variable locale.
          L'action se retire d'elle-même sur une ligne sans actions révélables.
        -->
        <!--
          `use:` s'installe au montage : l'action est donc toujours posée, et c'est
          `onReorder` qui décide si elle a quelque chose à faire. La poignée, elle,
          n'existe que si la rangée la déclare.
        -->
        <ul
          class={classesListe}
          use:swipeActions
          use:longPress
          use:reorderable={{ onReorder: (g, de, vers) => onReorder?.(g, de, vers) }}
        >
          {#each groupe.elements as element (element.index)}
            {@render listRow(element.item, element.index)}
          {/each}
        </ul>
      </div>
    {/each}
  {/if}
</div>
