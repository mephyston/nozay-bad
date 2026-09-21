<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Search, X } from '@lucide/svelte';

  /**
   * La pilule de recherche du menu : un champ en verre, refermable.
   *
   * Partagée par la barre du bas (loupe touchée depuis une page) et par le menu ouvert
   * (elle en occupe le bas) : même geste, même champ, même clavier.
   *
   * Le clavier virtuel ne pousse pas un élément fixé au bas de l'écran : c'est
   * `visualViewport` qui dit de combien il rogne l'écran, et la pilule remonte d'autant
   * — par une marge, pour que ce qui est posé au-dessus d'elle suive.
   */
  let {
    query = $bindable(''),
    placeholder = 'Chercher dans le menu…',
    onClose,
    onSubmit
  }: {
    query: string;
    placeholder?: string;
    onClose: () => void;
    /** Entrée : le premier résultat, si l'appelant en a un. */
    onSubmit?: () => void;
  } = $props();

  let input = $state<HTMLInputElement | null>(null);
  let keyboardInset = $state(0);

  export async function focus() {
    await tick();
    input?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
    }
  }

  onMount(() => {
    /*
      Le focus est repris après coup : dans le menu, la boîte qui l'héberge place elle-même
      le focus sur son premier élément à l'ouverture, juste après ce montage — un focus
      immédiat serait aussitôt volé, et Entrée suivrait le premier lien du menu.
    */
    const timer = setTimeout(() => focus(), 120);
    const vv = window.visualViewport;
    if (!vv) return () => clearTimeout(timer);
    const onResize = () => {
      keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      clearTimeout(timer);
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  });
</script>

<div class="glass-surface flex h-14 w-full items-center gap-2 rounded-full pl-4 pr-2" style="margin-bottom: {keyboardInset}px" data-menu-search>
  <Search class="h-5 w-5 shrink-0 text-muted-foreground" />
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
    aria-label={placeholder}
    class="h-full min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
    onkeydown={onKeydown}
  />
  <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Fermer la recherche" onclick={onClose}>
    <X class="h-5 w-5" />
  </button>
</div>
