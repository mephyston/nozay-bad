<script lang="ts">
  import { Home, ShoppingCart, Newspaper, CalendarDays } from '@lucide/svelte';
  import ShuttlecockIcon from './ShuttlecockIcon.svelte';

  let { currentPath = '' }: { currentPath?: string } = $props();

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
  const items = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/actualites', label: 'Actualités', icon: Newspaper },
    { href: '/agenda', label: 'Agenda', icon: CalendarDays },
    { href: '/boutique', label: 'Boutique', icon: ShoppingCart },
    { href: '/equipes', label: 'Équipes', icon: ShuttlecockIcon }
  ];
</script>

<nav
  class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-center justify-around pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.2)]"
>
  {#each items as item (item.href)}
    {@const Icon = item.icon}
    <!-- La fiche d'équipe et l'écran de composition descendent d'« Équipes » :
         l'onglet reste mis en évidence tant qu'on est dans cette branche. -->
    {@const active = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(`${item.href}/`))}
    <a
      href={item.href}
      aria-current={active ? 'page' : undefined}
      class={`flex flex-col items-center justify-center w-full py-2.5 gap-1 min-h-[56px] transition-colors decoration-transparent ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      <Icon class="w-6 h-6" />
      <span class="text-[11px] font-medium">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  /* env(safe-area-inset-bottom) : encoche/indicateur home iOS */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
</style>
