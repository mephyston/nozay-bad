<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../lib/utils.js';

  /**
   * Un groupe de champs, coiffé de son intitulé.
   *
   * Un libellé hors du champ reste légitime quand il coiffe **plusieurs** champs —
   * l'application Calendrier en garde pour « Répétition » ou « Alerte ». C'est
   * l'intitulé d'un champ isolé, redondant avec ce que le champ affiche déjà, que
   * la disposition iOS fait descendre dedans.
   */
  let {
    label,
    hint,
    class: className,
    children
  }: {
    label: string;
    hint?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<div class={cn('w-full space-y-2', className)}>
  <h3 class="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
  <div class="space-y-3">
    {@render children()}
  </div>
  {#if hint}
    <p class="px-1 text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>
