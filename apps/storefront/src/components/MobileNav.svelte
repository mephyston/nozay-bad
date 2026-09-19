<script lang="ts">
  import { Home, ShoppingCart, Newspaper, CalendarDays } from '@lucide/svelte';
  import ShuttlecockIcon from './ShuttlecockIcon.svelte';

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
  Barre flottante, en verre.

  Détachée du bord et arrondie, elle laisse le contenu défiler dessous : c'est le
  geste commun des barres d'onglets d'iOS 26 comme de Material 3 Expressive. La
  matière — fond translucide, flou, liseré clair — est celle du Liquid Glass d'iOS,
  que WebKit n'expose pas au web : on la fabrique avec `backdrop-filter`. Elle reste
  sobre sur Android, où seule la teinte du fond change ; rien des animations propres
  à iOS (rétractation au défilement, onglet qui gonfle) n'est repris : fragile en web,
  et étranger aux adhérents Android.

  Deux replis : un moteur sans `backdrop-filter` reçoit une barre opaque, et le réglage
  d'accessibilité « Réduire la transparence » du système aussi — le respecter, c'est ne
  pas contredire ce que l'utilisateur a demandé à son téléphone.

  Au défilement vers le bas, la barre se rétracte — plus petite, sans libellés — et
  revient dès qu'on remonte : le contenu reprend la place. C'est `Layout.astro` qui
  pose la classe `is-compact` (un script sans hydratation, la barre est rendue côté
  serveur) ; le composant ne connaît que les deux états.
-->
<nav
  class="glass-nav md:hidden fixed inset-x-3 z-50 flex items-center justify-around rounded-[1.75rem] px-1"
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
  .glass-nav {
    /* Teinte à 72 % : en dessous, le texte qui défile derrière gêne la lecture des libellés. */
    background: color-mix(in oklab, var(--card) 72%, transparent);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
    /* Le liseré clair du bord supérieur, qui fait le « verre », puis l'ombre portée qui décolle la barre. */
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.35),
      0 8px 24px rgb(0 0 0 / 0.12),
      0 1px 2px rgb(0 0 0 / 0.08);
  }
  :global(.dark) .glass-nav {
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.1),
      0 8px 28px rgb(0 0 0 / 0.45),
      0 1px 2px rgb(0 0 0 / 0.3);
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .glass-nav {
      background: var(--card);
    }
  }
  /*
    Rétractation : la barre rétrécit depuis le bas et perd ses libellés. `transform`
    plutôt que la hauteur, pour ne rien recalculer dans la page et ne pas peser dans
    le CLS ; les libellés s'effacent en largeur nulle pour que la pastille se resserre.
  */
  .glass-nav {
    transform-origin: 50% 100%;
    transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .nav-label {
    transition: opacity 160ms ease, max-height 200ms ease;
    max-height: 1.25rem;
  }
  .glass-nav.is-compact {
    transform: scale(0.82);
  }
  .glass-nav.is-compact .nav-item {
    min-height: 40px;
  }
  .glass-nav.is-compact .nav-label {
    opacity: 0;
    max-height: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .glass-nav,
    .nav-label {
      transition: none;
    }
  }
  @media (prefers-reduced-transparency: reduce) {
    .glass-nav {
      background: var(--card);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }
</style>
