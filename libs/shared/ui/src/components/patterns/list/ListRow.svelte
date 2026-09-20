<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { ChevronRight, MoreHorizontal } from '@lucide/svelte';
  import * as DropdownMenu from '../../ui/dropdown-menu/index.js';
  import { Button } from '../../ui/button/index.js';
  import { cn } from '../../../lib/utils.js';
  import { runAction } from '../../../lib/actions/run-action.js';
  import RowActionItems from './RowActionItems.svelte';
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
    actions,
    swipe = [],
    swipeOpen = false,
    chevron = !!href,
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
    actions?: Snippet<[T]>;
    /**
     * Actions révélées par un balayage vers la gauche. Les mêmes alimentent le menu
     * escamoté : une seule déclaration, trois chemins d'accès.
     */
    swipe?: SwipeAction<T>[];
    /**
     * Ouverture pilotée, pour les captures de régression visuelle — un geste ne se
     * photographie pas. N'a pas vocation à être utilisée par un écran.
     */
    swipeOpen?: boolean;
    chevron?: boolean;
    selected?: boolean;
    disabled?: boolean;
    class?: string;
    /** Échappatoire : remplace entièrement titre / sous-titre / valeur. */
    children?: Snippet;
  } = $props();

  let piste = $state<HTMLElement | null>(null);
  let coucheEl = $state<HTMLElement | null>(null);

  const TON_ACTION: Record<NonNullable<SwipeAction['tone']>, string> = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
  };

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
  class={cn('relative bg-card', swipe.length > 0 && 'overflow-hidden', className)}
>
  {#if swipe.length > 0}
    <!--
      La piste vit sous la couche glissante. Ses boutons sont hors du parcours de
      tabulation et masqués aux technologies d'assistance tant que la ligne est
      fermée : ils ne sont qu'un reflet visuel du menu, qui reste la voie clavier.

      `flex-row-reverse` : la première action déclarée doit toucher le bord de
      l'écran, parce que c'est elle qu'un balayage long exécute. L'ordre du DOM
      reste celui de la déclaration — le geste prend le premier bouton — seul le
      rendu s'inverse.
    -->
    <div
      data-swipe-track
      bind:this={piste}
      aria-hidden={!swipeOpen}
      class="absolute inset-y-0 right-0 flex flex-row-reverse"
    >
      {#each swipe as action (action.id)}
        {@const Icone = action.icon}
        <button
          type="button"
          tabindex="-1"
          data-no-swipe
          onclick={() => runAction(action, item as T)}
          class={cn(
            'flex min-w-[4.75rem] flex-col items-center justify-center gap-1 px-3 text-xs font-medium',
            TON_ACTION[action.tone ?? 'neutral']
          )}
        >
          {#if Icone}<Icone class="size-5" aria-hidden="true" />{/if}
          <span>{action.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  <div
    data-swipe-layer
    bind:this={coucheEl}
    class={cn(
      'relative flex items-center gap-2 bg-card px-4 transition-colors',
      selected && 'bg-accent',
      // Le navigateur garde le défilement vertical ; il ne nous livre que l'horizontal.
      swipe.length > 0 && 'touch-pan-y'
    )}
  >
    <!--
      `min-h-[3.25rem]` : 52 px, la hauteur au-dessous de laquelle une ligne cesse
      d'être visable au pouce. Elle ne se négocie pas par écran.
    -->
    {#if href && !disabled}
      <a
        {href}
        {onclick}
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

    {#if actions || swipe.length > 0}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              variant="ghost"
              size="icon-sm"
              {...props}
              class="sr-only focus:not-sr-only focus-visible:not-sr-only"
            >
              <span class="sr-only">Actions</span>
              <MoreHorizontal class="size-4" aria-hidden="true" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {#if actions}{@render actions(item as T)}{/if}
          {#if swipe.length > 0 && actions}
            <DropdownMenu.Separator />
          {/if}
          <RowActionItems actions={swipe} item={item as T} />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </div>
</li>

<style>
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
    [data-swipe-layer] {
      transition: none;
    }
  }
</style>
