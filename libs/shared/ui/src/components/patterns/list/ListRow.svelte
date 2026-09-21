<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { ChevronRight, Ellipsis } from '@lucide/svelte';
  import { cn } from '../../../lib/utils.js';
  import ListRowMenu from './ListRowMenu.svelte';
  import ListRowSwipeTrack from './ListRowSwipeTrack.svelte';
  import { TONE_CLASS, type Tone, type SwipeAction } from './list-types.js';

  let {
    item,
    href,
    onclick,
    title,
    subtitle,
    value,
    valueTone = 'muted',
    valueCaption,
    leading,
    badge,
    actions = [],
    swipeOpen = false,
    disclosure,
    onDisclosure,
    nested = false,
    chevron = !!href || !!onclick,
    selected = false,
    disabled = false,
    class: className,
    children
  }: {
    item?: T;
    href?: string;
    onclick?: (event: MouseEvent) => void;
    title?: string;
    subtitle?: string;
    value?: string;
    valueTone?: Tone;
    valueCaption?: string;
    /** Avatar ou icône. Reste petit : au-delà de 36 px, le titre n'a plus sa place. */
    leading?: Snippet;
    /** À droite du titre, sur la même ligne. */
    badge?: Snippet;
    /**
     * Items de `DropdownMenu` pour les actions de la ligne. Le déclencheur est
     * **escamoté** : invisible au doigt, il apparaît au `Tab` et s'annonce au
     * lecteur d'écran. C'est la contrepartie de la règle « une seule affordance
     * visible par ligne » — le chevron dit où l'on va, rien d'autre ne s'affiche.
     */
    /**
     * Ce qu'on peut faire de cette ligne, dans l'ordre.
     *
     * La **première** est celle qu'un balayage long exécute : y mettre le
     * réversible, jamais l'irréversible. Les trois premières se révèlent au
     * balayage ; au-delà, les deux premières et un « Plus… » qui ouvre la feuille
     * — la règle d'iOS, et celle qui garantit qu'aucune action n'est atteignable
     * par le seul maintien long, geste que rien n'annonce.
     */
    actions?: SwipeAction<T>[];
    /**
     * Ouverture pilotée, pour les captures de régression visuelle — un geste ne se
     * photographie pas. N'a pas vocation à être utilisée par un écran.
     */
    swipeOpen?: boolean;
    /**
     * Repli du groupe que cette ligne ouvre. Rendu **à gauche**, avant l'avatar :
     * sur iOS le chevron de tête déplie, celui de queue emmène ailleurs. Les mettre
     * du même côté rend la ligne illisible.
     *
     * `none` n'affiche rien mais réserve la place : dans une liste qui mêle des
     * lignes dépliables et des lignes simples, c'est ce qui garde les vignettes
     * alignées.
     */
    disclosure?: 'collapsed' | 'expanded' | 'none';
    onDisclosure?: () => void;
    /** Ligne fille d'un groupe : décalée pour s'aligner sous le titre du parent. */
    nested?: boolean;
    /**
     * Le chevron de queue dit que la ligne mène quelque part — fiche de détail ou
     * formulaire. Par défaut dès qu'elle est actionnable ; à mettre à `false` quand
     * l'appui ne fait qu'un changement sur place.
     */
    chevron?: boolean;
    selected?: boolean;
    disabled?: boolean;
    class?: string;
    /** Échappatoire : remplace entièrement titre / sous-titre / valeur. */
    children?: Snippet;
  } = $props();

  /*
    Trois actions se révèlent d'un balayage ; au-delà, deux et un « Plus… ». C'est
    la règle d'iOS, et elle répond à un défaut constaté : une action laissée au seul
    menu n'était atteignable que par un maintien long, que rien n'annonce.
  */
  const PLUS: SwipeAction<T> = {
    id: '__plus',
    label: 'Plus…',
    icon: Ellipsis,
    run: () => (menuOuvert = true)
  };
  const revelees = $derived(actions.length <= 3 ? actions : [...actions.slice(0, 2), PLUS]);

  let menuOuvert = $state(false);

  let piste = $state<HTMLElement | null>(null);
  let coucheEl = $state<HTMLElement | null>(null);


  // L'ouverture pilotée mesure la piste : sa largeur dépend du nombre d'actions
  // et de la longueur de leurs libellés, elle ne peut pas être écrite en dur.
  $effect(() => {
    if (!coucheEl || !piste) return;
    coucheEl.style.transform = swipeOpen ? `translate3d(${-piste.offsetWidth}px, 0, 0)` : '';
  });
</script>

{#snippet body()}
  {#if leading}
    <div class="shrink-0">{@render leading()}</div>
  {/if}

  {#if children}
    <div class="min-w-0 flex-1">{@render children()}</div>
  {:else}
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="truncate text-sm font-medium">{title}</span>
        {#if badge}{@render badge()}{/if}
      </div>
      {#if subtitle}
        <!--
          `data-selectable` : cette ligne porte souvent une référence qu'on recopie
          (un numéro de licence, un numéro de pièce). Les gestes qui suppriment la
          sélection de texte doivent y renoncer.
        -->
        <span data-selectable class="mt-0.5 block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      {/if}
    </div>
  {/if}

  {#if value !== undefined || valueCaption}
    <div class="shrink-0 text-right">
      {#if value !== undefined}
        <div class={cn('text-sm tabular-nums', TONE_CLASS[valueTone])}>{value}</div>
      {/if}
      {#if valueCaption}
        <div class="text-xs text-muted-foreground">{valueCaption}</div>
      {/if}
    </div>
  {/if}

  {#if chevron}
    <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  {/if}
{/snippet}

<li
  data-list-row
  data-context-menu={actions.length > 0 ? '' : undefined}
  class={cn('relative bg-card', actions.length > 0 && 'overflow-hidden', className)}
>
  {#if actions.length > 0}
    <ListRowSwipeTrack actions={revelees} item={item as T} open={swipeOpen} bind:ref={piste} />
  {/if}

  <div
    data-swipe-layer
    bind:this={coucheEl}
    class={cn(
      'relative flex items-center gap-2 bg-card px-4 transition-colors',
      selected && 'bg-accent',
      nested && 'pl-12',
      // Le navigateur garde le défilement vertical ; il ne nous livre que l'horizontal.
      actions.length > 0 && 'touch-pan-y'
    )}
  >
    {#if disclosure === 'none'}
      <span class="size-8 shrink-0" aria-hidden="true"></span>
    {:else if disclosure}
      <!--
        Hors de la zone cliquable de la ligne : un bouton ne vit pas dans un lien, et
        le repli ne doit pas déclencher la navigation. `data-no-swipe` le soustrait au
        balayage comme au maintien long.
      -->
      <button
        type="button"
        data-no-swipe
        aria-expanded={disclosure === 'expanded'}
        aria-label={disclosure === 'expanded' ? 'Replier' : 'Déplier'}
        onclick={onDisclosure}
        class="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <ChevronRight
          class={cn(
            'size-4 transition-transform duration-200',
            disclosure === 'expanded' && 'rotate-90'
          )}
        />
      </button>
    {/if}

    <!--
      `min-h-[3.25rem]` : 52 px, la hauteur au-dessous de laquelle une ligne cesse
      d'être visable au pouce. Elle ne se négocie pas par écran.
    -->
    {#if href && !disabled}
      <!--
        `draggable="false"` : un lien est glissable par défaut, et le navigateur
        ouvrait une session de glisser dès qu'on le tirait de côté — ce qui annule
        les événements de pointeur et tuait le balayage. Les lignes qui portent un
        `onclick` n'avaient pas le défaut, n'étant pas des liens : c'est ce qui
        faisait marcher les produits et pas les adhérents.
      -->
      <a
        {href}
        {onclick}
        draggable="false"
        class="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 py-2.5 text-foreground no-underline"
      >
        {@render body()}
      </a>
    {:else if onclick && !disabled}
      <button
        type="button"
        {onclick}
        class="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 py-2.5 text-left text-foreground"
      >
        {@render body()}
      </button>
    {:else}
      <div
        class={cn(
          'flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 py-2.5',
          disabled && 'opacity-50'
        )}
      >
        {@render body()}
      </div>
    {/if}

    {#if actions.length > 0}
      <ListRowMenu bind:open={menuOuvert} {actions} item={item as T} {title} />
    {/if}
  </div>
</li>

<style>
  /*
    Le maintien long ne peut être intercepté qu'en neutralisant la sélection de
    texte et le menu natif d'iOS — d'où la restriction aux lignes qui portent un
    menu, et l'exception `data-selectable` : une ligne porte souvent une
    référence qu'on recopie, un numéro de licence ou de pièce.
  */
  li[data-context-menu] [data-swipe-layer] {
    -webkit-touch-callout: none;
    user-select: none;
  }

  li[data-context-menu] [data-selectable] {
    -webkit-touch-callout: default;
    user-select: text;
  }

  /*
    Le pendant CSS de `draggable="false"`, que WebKit seul respecte : sans lui, un
    appui glissé sur un lien lève une image fantôme et le balayage n'a plus lieu.
  */
  [data-swipe-layer] a {
    -webkit-user-drag: none;
  }

  /*
    Le rappel : ressenti d'un tiroir qui se cale, pas d'une transition linéaire.
    Pendant le geste, `data-swiping` sur la liste la coupe — le doigt doit être
    suivi au pixel, une transition y ajouterait une latence.
  */
  [data-swipe-layer] {
    transition: transform 220ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  :global([data-swiping]) [data-swipe-layer] {
    transition: none;
  }

  /*
    Mouvement réduit ne veut pas dire manipulation supprimée : le suivi du doigt
    reste, c'est un retour et non une animation. Seul le rappel devient instantané.
  */
  @media (prefers-reduced-motion: reduce) {
    [data-swipe-layer],
    [aria-expanded] :global(svg) {
      transition: none;
    }
  }
</style>
