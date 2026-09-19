<script lang="ts">
  import { Home, ShoppingCart, Newspaper, CalendarDays, Search } from '@lucide/svelte';
  import { softNavigate, MenuSearchField } from '@nba/ui';
  import ShuttlecockIcon from './ShuttlecockIcon.svelte';
  import SearchResults from './SearchResults.svelte';
  import { storefrontNavGroups } from '../lib/nav';
  import type { SessionPayload } from '../lib/auth';

  /**
   * La barre du bas de l'espace adhérent : les onglets, et une loupe à part.
   *
   * La loupe est un cercle séparé, à droite de la pilule d'onglets — c'est le motif
   * d'iOS 26, où la recherche n'est pas un onglet. Elle s'étire en champ qui répond à
   * deux étages : le **menu** (onglets et entrées de « Mon compte »), instantané et
   * sans réseau, et le **contenu** du club — adhérents, actualités, agenda, équipes,
   * boutique — demandé à l'API, deux lettres et un temps de latence plus tard. La loupe
   * n'est jamais muette : le menu répond avant que le réseau ne parle.
   */
  let {
    currentPath = '',
    features = {},
    session = null
  }: {
    currentPath?: string;
    features?: Partial<Record<string, boolean>>;
    session?: Pick<SessionPayload, 'members' | 'activeMemberId'> | null;
  } = $props();

  // Cinq cases, la limite de ce qu'une barre d'onglets supporte avant que les
  // libellés ne deviennent illisibles — d'autant qu'elle laisse désormais sa droite à
  // la loupe. Une rubrique que le club a éteinte (boutique, interclubs) disparaît ; une
  // clé absente des fonctionnalités vaut « allumée ».
  const items = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/actualites', label: 'Actualités', icon: Newspaper },
    { href: '/agenda', label: 'Calendrier', icon: CalendarDays },
    { href: '/boutique', label: 'Boutique', icon: ShoppingCart, feature: 'shop' },
    { href: '/equipes', label: 'Mon club', icon: ShuttlecockIcon, feature: 'teams' }
  ].filter((item) => !item.feature || features[item.feature] !== false);

  let open = $state(false);
  let query = $state('');
  let firstHref = $state<string | null>(null);
  const groups = $derived(storefrontNavGroups({ features, session }));

  function closeSearch() {
    open = false;
    query = '';
  }

  function go(href: string) {
    closeSearch();
    softNavigate(href);
  }

  function submit() {
    if (firstHref) go(firstHref);
  }
</script>

{#if open}
  <button type="button" class="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" aria-label="Fermer la recherche" onclick={closeSearch}></button>
{/if}

<!--
  Barre flottante, en verre — voir `.glass-surface` dans `global.css`. Détachée du bord
  et arrondie, elle laisse le contenu défiler dessous : le geste commun des barres
  d'onglets d'iOS 26 comme de Material 3 Expressive. Tant que la page défile, dans un
  sens comme dans l'autre, elle se rétracte — plus petite, sans libellés — et revient
  dès que le doigt s'arrête ; c'est `Layout.astro` qui pose la classe `is-compact`.
-->
<div
  class="md:hidden fixed inset-x-3 z-50 flex items-end {open ? 'gap-0' : 'gap-2'}"
  style="bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
  data-mobile-nav
>
  <nav
    class="glass-surface nav-pill flex min-w-0 flex-1 items-center justify-around rounded-[1.75rem] px-1 transition-[width,opacity] duration-200 {open ? 'hidden' : ''}"
    aria-label="Navigation principale"
  >
    {#each items as item (item.href)}
      {@const Icon = item.icon}
      <!-- La fiche d'équipe et l'écran de composition descendent d'« Équipes » :
           l'onglet reste mis en évidence tant qu'on est dans cette branche. -->
      {@const active = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(`${item.href}/`))}
      <a
        href={item.href}
        aria-current={active ? 'page' : undefined}
        class={`nav-item flex flex-col items-center justify-center flex-1 min-w-0 my-1 py-1.5 gap-0.5 min-h-[48px] rounded-[1.25rem] transition-colors decoration-transparent ${
          active ? 'text-primary bg-primary/12' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Icon class="w-6 h-6 shrink-0" />
        <span class="nav-label text-[10px] font-medium truncate max-w-full px-0.5">{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="relative flex min-w-0 justify-end {open ? 'flex-1' : 'shrink-0'}">
    {#if open}
      {#if query.trim()}
        <div class="glass-surface absolute inset-x-0 bottom-full mb-2 max-h-[60dvh] overflow-y-auto rounded-2xl" data-testid="search-results">
          <SearchResults {query} {groups} bind:firstHref onPick={go} />
        </div>
      {/if}
      <MenuSearchField bind:query placeholder="Adhérent, article, équipe, produit…" onClose={closeSearch} onSubmit={submit} />
    {:else}
      <button
        type="button"
        class="glass-surface nav-loupe flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-foreground"
        aria-label="Rechercher"
        onclick={() => (open = true)}
      >
        <Search class="h-6 w-6" />
      </button>
    {/if}
  </div>
</div>

<style>
  /*
    Rétractation : la pilule et la loupe rétrécissent depuis le bas, la pilule perd
    ses libellés. `transform` plutôt que la hauteur, pour ne rien recalculer dans la
    page ; les libellés s'effacent en hauteur nulle pour que la pilule se resserre.
  */
  .nav-pill,
  .nav-loupe {
    transform-origin: 50% 100%;
    transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .nav-label {
    transition: opacity 160ms ease, max-height 200ms ease;
    max-height: 1.25rem;
  }
  :global([data-mobile-nav].is-compact) .nav-pill,
  :global([data-mobile-nav].is-compact) .nav-loupe {
    transform: scale(0.82);
  }
  :global([data-mobile-nav].is-compact) .nav-item {
    min-height: 40px;
  }
  :global([data-mobile-nav].is-compact) .nav-label {
    opacity: 0;
    max-height: 0;
  }
  /* Sous 360 px, cinq libellés ne tiennent plus à côté de la loupe : icônes seules. */
  @media (max-width: 359px) {
    .nav-label {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .nav-pill,
    .nav-loupe,
    .nav-label {
      transition: none;
    }
  }
</style>
