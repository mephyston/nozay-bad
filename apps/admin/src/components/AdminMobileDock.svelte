<script lang="ts">
  import { Menu as MenuIcon, Search } from '@lucide/svelte';
  import type { NavGroup, QuickAction } from '../lib/nav';
  import { searchNav, MenuSearchField, MenuSearchResults, type NavSearchHit } from '@nba/ui';

  /**
   * La barre du bas de l'administration, sur téléphone.
   *
   * Deux cercles en verre, séparés, comme dans l'app Météo : **Menu** à gauche ouvre le
   * menu — avec sa pilule de recherche déjà déployée en bas — ; la **loupe** à droite
   * s'étire ici même en champ de recherche qui filtre le menu, pages et saisies rapides,
   * sans quitter la page. Les résultats s'affichent au-dessus du champ, près du pouce
   * et au-dessus du clavier.
   *
   * Au défilement, dans les deux sens, les cercles se font petits ; ils reviennent dès
   * que le doigt s'arrête. La recherche ouverte suspend la rétractation.
   */
  let {
    groups = [],
    actions = [],
    icons = {},
    onMenuClick,
    onPick,
    scrollContainer
  }: {
    /** Le menu tel que la barre latérale l'affiche : déjà filtré par droits et fonctionnalités. */
    groups: Pick<NavGroup, 'label' | 'items'>[];
    /** Saisies rapides ouvertes à ce compte. */
    actions: QuickAction[];
    /** Icônes Lucide par nom, résolues par le layout (`nav.ts` est aussi lu côté serveur). */
    icons: Record<string, any>;
    onMenuClick: () => void;
    /** Un résultat choisi : le layout navigue, ou ouvre la saisie rapide sur place. */
    onPick: (hit: NavSearchHit) => void;
    /** L'élément qui défile : le contenu de l'administration, pas la fenêtre. */
    scrollContainer?: HTMLElement | null;
  } = $props();

  let open = $state(false);
  let query = $state('');
  let compact = $state(false);

  const hits = $derived<NavSearchHit[]>(open ? searchNav(groups, actions, query) : []);

  function openSearch() {
    open = true;
    compact = false;
  }

  function closeSearch() {
    open = false;
    query = '';
  }

  function pick(hit: NavSearchHit) {
    closeSearch();
    onPick(hit);
  }

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

{#if open}
  <!-- Toucher hors du panneau referme la recherche ; le clavier se range avec. -->
  <button type="button" class="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" aria-label="Fermer la recherche" onclick={closeSearch}></button>
{/if}

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

  <div class="relative flex min-w-0 justify-end {open ? 'flex-1' : ''}">
    {#if open}
      {#if query.trim()}
        <div class="glass-surface absolute inset-x-0 bottom-full mb-2 max-h-[50dvh] overflow-y-auto rounded-2xl">
          <MenuSearchResults {hits} {query} {icons} onPick={pick} />
        </div>
      {/if}
      <MenuSearchField bind:query onClose={closeSearch} onSubmit={() => hits[0] && pick(hits[0])} />
    {:else}
      <button
        type="button"
        class="glass-surface dock-circle flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-foreground"
        aria-label="Chercher dans le menu"
        onclick={openSearch}
      >
        <Search class="h-6 w-6" />
      </button>
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
