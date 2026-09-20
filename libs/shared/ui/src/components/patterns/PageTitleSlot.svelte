<script lang="ts">
  import { cn } from '../../lib/utils.js';

  /**
   * Le titre de page replié, dans la barre de l'application.
   *
   * Il ne se positionne pas lui-même : placé dans le flux d'une barre en
   * `justify-between`, il se centrerait entre ses deux voisins — dont les
   * largeurs diffèrent — et non au milieu de l'écran. C'est à la barre de le
   * centrer, en absolu.
   *
   * Purement présentationnel : l'observation du défilement appartient au layout,
   * seul îlot qui possède à la fois la barre et le conteneur défilant. `PageHeader`
   * n'est, lui, pas toujours hydraté — dans une page Astro il est rendu côté
   * serveur sans directive `client:` — et ne pouvait donc rien observer.
   */
  let {
    title,
    collapsed = false,
    class: className
  }: {
    title: string;
    collapsed?: boolean;
    class?: string;
  } = $props();
</script>

<div
  class={cn(
    'pointer-events-none min-w-0 px-2 text-center transition-[opacity,transform] duration-200',
    collapsed ? 'opacity-100' : 'translate-y-1 opacity-0',
    className
  )}
  aria-hidden="true"
>
  <span class="block truncate text-sm font-semibold">{title}</span>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    div {
      transition: none;
    }
  }
</style>
