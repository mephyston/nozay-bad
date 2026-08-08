<script lang="ts">
  import { Home, ShoppingCart, Wallet, MoreHorizontal } from '@lucide/svelte';

  let { currentPath = '', canExpense = true }: { currentPath?: string; canExpense?: boolean } = $props();

  // Trois destinations quotidiennes seulement : au-delà, les onglets deviennent
  // trop étroits sur un petit écran et aucun n'est plus atteignable au pouce.
  const items = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/mon-compte', label: 'Compte', icon: Wallet },
    { href: '/boutique', label: 'Boutique', icon: ShoppingCart }
  ];

  // Écrans plus rarement consultés : ils n'ont pas leur propre onglet, mais restent
  // accessibles à tout moment — y compris en PWA, où le pied de page est masqué.
  const secondaryLinks = $derived([
    ...(canExpense ? [{ href: '/note-de-frais', label: 'Notes de frais' }] : []),
    { href: '/attestation', label: 'Attestation CSE' },
    { href: '/notifications', label: 'Mes notifications' },
    { href: '/confidentialite', label: 'Politique de confidentialité' },
    { href: '/mentions-legales', label: 'Mentions légales' }
  ]);

  const isSecondaryActive = $derived(secondaryLinks.some((l) => l.href === currentPath));
</script>

<nav
  class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-center justify-around pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.2)]"
>
  {#each items as item (item.href)}
    {@const Icon = item.icon}
    {@const active = currentPath === item.href}
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

  <!-- <details> plutôt qu'un panneau piloté en JS : cette barre est rendue côté
       serveur sans hydratation, le repli natif fonctionne donc partout. -->
  <details class="relative w-full" open={isSecondaryActive}>
    <summary
      class={`flex flex-col items-center justify-center w-full py-2.5 gap-1 min-h-[56px] cursor-pointer transition-colors ${
        isSecondaryActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      <MoreHorizontal class="w-6 h-6" />
      <span class="text-[11px] font-medium">Plus</span>
    </summary>

    <div
      class="absolute bottom-full right-1 mb-2 w-60 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-1.5"
    >
      {#each secondaryLinks as link (link.href)}
        <a
          href={link.href}
          aria-current={currentPath === link.href ? 'page' : undefined}
          class={`block rounded-lg px-3 py-2.5 text-sm decoration-transparent ${
            currentPath === link.href ? 'text-primary font-medium' : 'text-foreground hover:bg-accent'
          }`}
        >
          {link.label}
        </a>
      {/each}
    </div>
  </details>
</nav>

<style>
  /* env(safe-area-inset-bottom) : encoche/indicateur home iOS */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* Le chevron natif du <summary> casserait l'alignement des onglets. */
  summary {
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
</style>
