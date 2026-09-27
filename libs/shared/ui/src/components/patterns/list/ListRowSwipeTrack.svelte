<script lang="ts" generics="T">
  import { cn } from '../../../lib/utils.js';
  import { runAction } from '../../../lib/actions/run-action.js';
  import type { SwipeAction } from './list-types.js';

  /**
   * Les actions révélées sous une ligne balayée.
   *
   * Ses boutons restent hors du parcours de tabulation et masqués aux technologies
   * d'assistance tant que la ligne est fermée : ils ne sont qu'un reflet visuel du
   * menu, qui reste la voie clavier. La déclaration, elle, est unique.
   */
  let {
    actions,
    item,
    open = false,
    ref = $bindable<HTMLElement | null>(null)
  }: {
    actions: SwipeAction<T>[];
    item: T;
    open?: boolean;
    /** La ligne mesure sa largeur pour caler l'ouverture pilotée. */
    ref?: HTMLElement | null;
  } = $props();

  const TON: Record<NonNullable<SwipeAction['tone']>, string> = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
  };
</script>

<!--
  `flex-row-reverse` : la première action déclarée doit toucher le bord de l'écran,
  parce que c'est elle qu'un balayage long exécute. L'ordre du DOM reste celui de la
  déclaration — le geste prend le premier bouton — seul le rendu s'inverse.
-->
<!--
  Armée (`data-swipe-armed` posé sur la ligne par le geste), l'action de tête s'étire sur
  toute la largeur révélée et les autres s'effacent : on voit qu'un relâché va agir, et
  qu'il suffit de revenir en arrière pour l'éviter.
-->
<div
  bind:this={ref}
  data-swipe-track
  aria-hidden={!open}
  class="piste absolute inset-y-0 right-0 flex flex-row-reverse"
>
  {#each actions as action (action.id)}
    {@const Icone = action.icon}
    <button
      type="button"
      tabindex="-1"
      data-no-swipe
      onclick={() => runAction(action, item)}
      class={cn(
        'flex min-w-[4.75rem] flex-col items-center justify-center gap-1 px-3 text-xs font-medium',
        TON[action.tone ?? 'neutral']
      )}
    >
      {#if Icone}<Icone class="size-5" aria-hidden="true" />{/if}
      <span>{action.label}</span>
    </button>
  {/each}
</div>

<style>
  :global([data-swipe-armed]) .piste > button:first-child {
    flex: 1;
  }
  :global([data-swipe-armed]) .piste > button:not(:first-child) {
    display: none;
  }
</style>
