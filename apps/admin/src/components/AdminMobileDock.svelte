<script lang="ts">
  import { Menu as MenuIcon, Search } from '@lucide/svelte';
  import { MenuSearchField, dockDePage } from '@nba/ui';

  /**
   * La barre du bas de l'administration, sur téléphone.
   *
   * Des cercles en verre, séparés, comme dans l'app Météo. **Menu** à gauche ouvre
   * le menu — avec sa pilule de recherche déjà déployée en bas. À droite, ce que
   * l'écran courant y met : sa **recherche** et son **action principale**.
   *
   * La loupe ne cherche plus dans le menu : cette recherche-là existe déjà dans le
   * menu ouvert, et deux loupes voulant dire deux choses différentes est ce qu'une
   * barre du bas pardonne le moins. Ce qui se cherche ici est ce qui est à l'écran.
   *
   * L'action principale d'une liste — « Nouveau produit », « Nouveau gymnase » —
   * vivait en haut de la barre d'outils, là où un pouce ne va pas et d'où elle
   * défilait hors de l'écran. Elle descend à portée.
   *
   * Au défilement, dans les deux sens, les cercles se font petits ; ils reviennent
   * dès que le doigt s'arrête. La recherche ouverte suspend la rétractation.
   */
  let {
    onMenuClick,
    scrollContainer
  }: {
    onMenuClick: () => void;
    /** L'élément qui défile : le contenu de l'administration, pas la fenêtre. */
    scrollContainer?: HTMLElement | null;
  } = $props();

  let open = $state(false);
  let query = $state('');
  let compact = $state(false);

  const recherche = $derived(dockDePage.recherche);
  const action = $derived(dockDePage.action);

  function openSearch() {
    open = true;
    compact = false;
  }

  function closeSearch() {
    open = false;
    query = '';
  }

  function valider() {
    recherche?.onSubmit(query);
    // Pas de voile ni de panneau de résultats : ce qui filtre est la liste derrière.
    // La validation navigue le plus souvent, ce qui remonte l'îlot et referme d'office.
    open = false;
  }

  // Un écran sans recherche ne doit pas garder un champ ouvert derrière lui.
  $effect(() => {
    if (!recherche && open) closeSearch();
  });

  /*
    Rétractation au défilement, dans les deux sens ; retour au repos du doigt.

    Un effet et non `onMount` : le conteneur arrive par `bind:this` du layout, posé
    après le montage de cette barre — lu une seule fois au montage, il serait encore nul.
  */
  $effect(() => {
    const container = scrollContainer;
    if (!container) return;
    let last = container.scrollTop;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = container.scrollTop;
        if (Math.abs(y - last) <= 6) return;
        last = y;
        if (!open) compact = y > 24;
        clearTimeout(timer);
        timer = setTimeout(() => (compact = false), 350);
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  });
</script>

<div
  class="dock md:hidden fixed inset-x-4 z-50 flex items-end justify-between {open ? 'gap-0' : 'gap-3'} {compact ? 'is-compact' : ''}"
  style="bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
  data-admin-dock
>
  <button
    type="button"
    class="glass-surface dock-circle flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-foreground transition-[width,opacity] duration-200 {open ? 'w-0 border-0 opacity-0 pointer-events-none' : 'w-14'}"
    aria-label="Ouvrir le menu"
    aria-hidden={open}
    tabindex={open ? -1 : 0}
    onclick={onMenuClick}
  >
    <MenuIcon class="h-6 w-6" />
  </button>

  <div class="relative flex min-w-0 items-end justify-end gap-3 {open ? 'flex-1' : ''}">
    {#if open && recherche}
      <MenuSearchField
        bind:query
        placeholder={recherche.placeholder}
        onClose={closeSearch}
        onSubmit={valider}
      />
    {:else}
      {#if recherche}
        <button
          type="button"
          class="glass-surface dock-circle flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-foreground"
          aria-label={recherche.placeholder}
          onclick={openSearch}
        >
          <Search class="h-6 w-6" />
        </button>
      {/if}

      {#if action}
        {@const Icone = action.icone as any}
        <!-- Pleine, et non en verre : c'est l'action principale, elle s'annonce. -->
        <button
          type="button"
          class="dock-circle flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label={action.libelle}
          onclick={action.run}
        >
          <Icone class="h-6 w-6" />
        </button>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* Rétractation : chaque cercle rétrécit depuis le bas, sans rien déplacer dans la page. */
  .dock-circle {
    transform-origin: 50% 100%;
    transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .dock.is-compact .dock-circle {
    transform: scale(0.78);
  }
  @media (prefers-reduced-motion: reduce) {
    .dock-circle {
      transition: none;
    }
  }
</style>
