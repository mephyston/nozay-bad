<script lang="ts">
  import { Home, ShoppingCart, Newspaper, CalendarDays } from '@lucide/svelte';
  import ShuttlecockIcon from './ShuttlecockIcon.svelte';

  /**
   * La barre du bas de l'espace adhérent : les onglets, et rien d'autre.
   *
   * La recherche est dans l'en-tête, au doigt comme à la souris (`HeaderSearch`) : une
   * loupe ici en ferait une seconde à l'écran.
   */
  let { currentPath = '', features = {} }: { currentPath?: string; features?: Partial<Record<string, boolean>> } = $props();

  // Cinq cases, la limite de ce qu'une barre d'onglets supporte avant que les
  // libellés ne deviennent illisibles.
  //
  // « Jeunes » n'a plus d'onglet : c'est devenu une rubrique parmi d'autres du filtre
  // d'« Actualités », qui réunit désormais toutes les communications du club. La case
  // ainsi libérée revient à « Agenda », qui n'aurait aucun autre chemin.
  //
  // La cinquième case était un menu « Plus » ; « Équipes » la prend désormais en
  // entier. Les deux écrans qui y étaient relégués — « Notes de frais » et
  // « Mon attestation CSE » — sont passés dans le menu « Mon compte » de l'en-tête,
  // toujours à portée, y compris en PWA où le pied de page est masqué.
  //
  // Une rubrique que le club a éteinte (boutique, interclubs) disparaît de la barre ;
  // une clé absente des fonctionnalités vaut « allumée ».
  const items = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/actualites', label: 'Actualités', icon: Newspaper },
    { href: '/agenda', label: 'Calendrier', icon: CalendarDays },
    { href: '/boutique', label: 'Boutique', icon: ShoppingCart, feature: 'shop' },
    { href: '/equipes', label: 'Mon club', icon: ShuttlecockIcon, feature: 'teams' }
  ].filter((item) => !item.feature || features[item.feature] !== false);
</script>

<!--
  Barre flottante, en verre — voir `.glass-surface` dans `global.css`. Détachée du bord
  et arrondie, elle laisse le contenu défiler dessous : le geste commun des barres
  d'onglets d'iOS 26 comme de Material 3 Expressive. Tant que la page défile, dans un
  sens comme dans l'autre, elle se rétracte — plus petite, sans libellés — et revient
  dès que le doigt s'arrête ; c'est `Layout.astro` qui pose la classe `is-compact`.
-->
<nav
  class="glass-surface nav-pill md:hidden fixed inset-x-3 z-50 flex items-center justify-around rounded-[1.75rem] px-1"
  style="bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
  aria-label="Navigation principale"
  data-mobile-nav
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
      <span class="nav-label text-[11px] font-medium truncate max-w-full px-1">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  /*
    Rétractation : la barre rétrécit depuis le bas et perd ses libellés. `transform`
    plutôt que la hauteur, pour ne rien recalculer dans la page et ne pas peser dans
    le CLS ; les libellés s'effacent en hauteur nulle pour que la pilule se resserre.
  */
  .nav-pill {
    transform-origin: 50% 100%;
    transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .nav-label {
    transition: opacity 160ms ease, max-height 200ms ease;
    max-height: 1.25rem;
  }
  .nav-pill.is-compact {
    transform: scale(0.82);
  }
  .nav-pill.is-compact .nav-item {
    min-height: 40px;
  }
  .nav-pill.is-compact .nav-label {
    opacity: 0;
    max-height: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .nav-pill,
    .nav-label {
      transition: none;
    }
  }
</style>
