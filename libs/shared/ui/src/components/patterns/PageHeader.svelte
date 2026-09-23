<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import { cn } from '../../lib/utils.js';

  let {
    title,
    description,
    retour,
    actions,
    search,
    class: className
  }: {
    title: string;
    description?: string;
    /**
     * D'où l'on vient, sur une page de détail.
     *
     * Rendu en rond à gauche du titre, et **sur téléphone seulement** : au-dessus de
     * 768 px, le fil d'Ariane de la barre du haut dit déjà où l'on est et comment
     * remonter. Un lien de texte en bas de page ne le disait qu'à qui défilait
     * jusqu'en bas — et sur un écran de sélection, c'est après trente candidats.
     *
     * `libelle` est le nom accessible du bouton, jamais une icône seule : « Retour aux
     * soirées » dit où l'on retourne, ce qu'un chevron ne dit pas.
     */
    retour?: { href: string; libelle: string };
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
    <div class="flex min-w-0 items-center gap-3">
      {#if retour}
        <a
          href={retour.href}
          aria-label={retour.libelle}
          class="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none md:hidden"
        >
          <ChevronLeft class="size-5" />
        </a>
      {/if}

      <div class="flex min-w-0 flex-col gap-1">
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
