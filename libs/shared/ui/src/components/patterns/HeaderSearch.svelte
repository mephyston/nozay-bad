<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tick } from 'svelte';
  import { Search, X } from '@lucide/svelte';

  /**
   * La recherche de l'en-tête, à la souris.
   *
   * Une loupe dans l'en-tête ; touchée, un panneau descend du haut de l'écran — comme
   * sur apple.com — avec un grand champ et, dessous, ce que l'appelant veut y montrer :
   * des liens rapides avant la saisie, des résultats ensuite. Le reste de la page
   * s'estompe derrière. Échap, la croix ou un clic hors du panneau le referment.
   *
   * L'appelant tient la saisie (`bind:query`) et rend les résultats (`children`) : le
   * panneau ne sait rien de ce qu'on cherche.
   */
  let {
    query = $bindable(''),
    placeholder = 'Rechercher',
    label = 'Rechercher',
    class: className = '',
    onSubmit,
    onClose,
    children
  }: {
    query: string;
    placeholder?: string;
    label?: string;
    /** Classes du bouton loupe : c'est l'en-tête qui décide où et quand il se voit. */
    class?: string;
    /** Entrée : le premier résultat, si l'appelant en a un. */
    onSubmit?: () => void;
    onClose?: () => void;
    children: Snippet;
  } = $props();

  let open = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  export async function openSearch() {
    open = true;
    await tick();
    input?.focus();
  }

  export function closeSearch() {
    if (!open) return;
    open = false;
    query = '';
    onClose?.();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
    }
  }
</script>

<button
  type="button"
  class="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground {className}"
  aria-label={label}
  aria-expanded={open}
  onclick={openSearch}
>
  <Search class="h-5 w-5" />
</button>

{#if open}
  <!-- Le reste de la page s'estompe ; un clic dessus referme. -->
  <button type="button" class="fixed inset-0 z-[90] cursor-default bg-background/60 backdrop-blur-md animate-in fade-in duration-200" aria-label="Fermer la recherche" onclick={closeSearch}></button>
  <div
    class="fixed inset-x-0 top-0 z-[91] border-b border-border bg-card/95 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-4 fade-in duration-200"
    style="padding-top: env(safe-area-inset-top, 0px)"
    role="dialog"
    aria-label={label}
    data-header-search
  >
    <div class="mx-auto w-full max-w-2xl px-6 pb-6 pt-7">
      <div class="flex items-center gap-3">
        <Search class="h-6 w-6 shrink-0 text-muted-foreground" />
        <input
          bind:this={input}
          bind:value={query}
          type="text"
          inputmode="search"
          enterkeyhint="go"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          {placeholder}
          aria-label={label}
          class="h-12 min-w-0 flex-1 bg-transparent text-2xl font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/70 focus:outline-none"
          onkeydown={onKeydown}
        />
        <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Fermer la recherche" onclick={closeSearch}>
          <X class="h-5 w-5" />
        </button>
      </div>
      <div class="mt-4 max-h-[60dvh] overflow-y-auto">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
