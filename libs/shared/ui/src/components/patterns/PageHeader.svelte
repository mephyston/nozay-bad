<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../lib/utils.js';

  let {
    title,
    description,
    actions,
    search,
    class: className
  }: {
    title: string;
    description?: string;
    actions?: Snippet;
    /**
     * Le champ de recherche, rendu **sous** le titre et défilant avec lui — la
     * disposition iOS. Une barre de recherche collante est l'exception, pas la règle.
     */
    search?: Snippet;
    class?: string;
  } = $props();
</script>

<div class={cn('flex flex-col gap-4', className)}>
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div class="flex flex-col gap-1">
      <!--
        `data-page-title` : le repère qu'observe la barre de l'application pour
        savoir quand replier le titre. Un attribut statique, donc présent même
        lorsque cet en-tête est rendu côté serveur sans être hydraté.
      -->
      <h1 data-page-title class="text-3xl font-bold tracking-tight">{title}</h1>
      <!--
        Masquée sur téléphone : elle repousse la liste d'une ou deux lignes sans
        rien dire que le titre ne dise déjà. Rendue pour le lecteur d'écran, qui
        l'annonce avec le titre.
      -->
      {#if description}
        <p class="sr-only text-muted-foreground md:not-sr-only">{description}</p>
      {/if}
    </div>
    {#if actions}
      <div class="flex items-center gap-2">
        {@render actions()}
      </div>
    {/if}
  </div>

  {#if search}
    <div class="md:hidden">{@render search()}</div>
  {/if}
</div>
