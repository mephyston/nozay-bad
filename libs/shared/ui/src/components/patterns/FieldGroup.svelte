<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../lib/utils.js';

  /**
   * Un groupe de champs, dans la forme d'iOS : **une seule carte** arrondie, dont
   * les rangées sont séparées par un filet, coiffée d'un intitulé et suivie, s'il y
   * a lieu, de son explication.
   *
   * C'est la différence avec une simple pile de champs cerclés chacun du sien : la
   * carte dit que ces réglages vont ensemble, et l'intitulé au-dessus porte ce que
   * chaque rangée n'a plus à répéter.
   *
   * Les rangées ne dessinent donc plus leur propre bordure ici — la carte s'en
   * charge. Le style ci-dessous la leur retire, plutôt que de faire descendre un
   * drapeau par le contexte dans chaque composant de champ.
   */
  let {
    label,
    hint,
    class: className,
    children
  }: {
    label?: string;
    /** L'explication du groupe, sous la carte, comme dans Rappels. */
    hint?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<div class={cn('w-full space-y-2', className)}>
  {#if label}
    <h3 class="px-4 text-sm text-muted-foreground">{label}</h3>
  {/if}

  <div class="groupe divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
    {@render children()}
  </div>

  {#if hint}
    <p class="px-4 text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>

<style>
  /*
    La carte porte la bordure et le rayon ; ses rangées n'en ont plus. Le sélecteur
    global est assumé : l'alternative serait de faire descendre un drapeau par le
    contexte dans chacun des six composants de champ, pour un résultat identique.
  */
  .groupe :global([data-field-row]),
  .groupe :global([data-slot='input']),
  .groupe :global([data-slot='textarea']),
  .groupe :global([data-slot='select']) {
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  /* Les rangées respirent comme celles d'iOS, et gardent leur cible de 44 points. */
  .groupe :global([data-field-row]),
  .groupe :global([data-slot='input']),
  .groupe :global([data-slot='textarea']) {
    min-height: 2.75rem;
    padding-inline: 1rem;
  }

  .groupe :global([data-slot='select']) {
    padding-inline: 1rem;
  }
</style>
