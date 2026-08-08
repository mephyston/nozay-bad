<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { slide } from 'svelte/transition';

  /**
   * Section repliable.
   *
   * L'en-tête est un vrai `<button>` porteur de `aria-expanded` : le repli doit
   * rester utilisable au clavier et annoncé par un lecteur d'écran, ce qu'un
   * `<div>` cliquable ne fait pas.
   */
  let {
    title,
    description,
    /** Compteur affiché à droite du titre (ex. le nombre d'éléments repliés). */
    badge,
    open = $bindable(false),
    children
  }: {
    title: string;
    description?: string;
    badge?: string | number;
    open?: boolean;
    children: Snippet;
  } = $props();

  const contentId = `collapsible-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="rounded-xl border border-border bg-card overflow-hidden">
  <button
    type="button"
    class="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
    aria-expanded={open}
    aria-controls={contentId}
    onclick={() => (open = !open)}
  >
    <div class="min-w-0">
      <div class="text-sm font-semibold text-foreground flex items-center gap-2">
        {title}
        {#if badge !== undefined}
          <span class="text-xs font-medium text-muted-foreground">({badge})</span>
        {/if}
      </div>
      {#if description}
        <p class="text-xs text-muted-foreground mt-0.5">{description}</p>
      {/if}
    </div>
    <ChevronDown
      class="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 {open
        ? 'rotate-180'
        : ''}"
    />
  </button>

  {#if open}
    <div id={contentId} class="px-4 pb-4 border-t border-border pt-4" transition:slide={{ duration: 150 }}>
      {@render children()}
    </div>
  {/if}
</div>
