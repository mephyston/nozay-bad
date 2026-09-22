<script lang="ts">
  import { cn } from '../../../lib/utils.js';

  let {
    label,
    sticky = false,
    count,
    value,
    class: className
  }: {
    label: string;
    /**
     * En-tête collant. Réservé au style `plain` : en `grouped`, le conteneur de
     * chaque section est arrondi donc `overflow-hidden`, et un en-tête collant s'y
     * arrêterait au bord de la carte au lieu du haut de l'écran.
     */
    sticky?: boolean;
    count?: number;
    /**
     * Un agrégat de la section, à la place du compte : un total, un solde.
     *
     * Le grand livre en avait besoin — le solde de fin de mois vivait dans une ligne
     * de tableau bricolée, invisible à la vue liste. Une section qui regroupe par date
     * ou par nature a presque toujours un nombre à montrer ; le compte n'est que le
     * plus banal d'entre eux.
     */
    value?: string;
    class?: string;
  } = $props();
</script>

<h3
  class={cn(
    'flex items-baseline justify-between px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
    sticky &&
      'sticky top-[var(--list-sticky-top,0px)] z-10 bg-background/85 backdrop-blur-sm',
    className
  )}
>
  <span>{label}</span>
  {#if value !== undefined}
    <span class="font-normal tabular-nums normal-case">{value}</span>
  {:else if count !== undefined}
    <span class="font-normal tabular-nums">{count}</span>
  {/if}
</h3>
