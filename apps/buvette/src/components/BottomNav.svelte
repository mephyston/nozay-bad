<script lang="ts">
  import { QrCode, ShoppingBasket, User, Wallet } from '@lucide/svelte';

  /** La barre flottante de l'espace adhérent : mêmes formes, quatre onglets. */
  let { currentPath = '' }: { currentPath?: string } = $props();

  const items = [
    { href: '/', label: 'Ma carte', icon: Wallet },
    { href: '/commander', label: 'Commander', icon: ShoppingBasket },
    { href: '/qr', label: 'Mon QR', icon: QrCode },
    { href: '/compte', label: 'Compte', icon: User }
  ];

  const isActive = (href: string) => currentPath === href || (href === '/' && currentPath.startsWith('/transactions'));
  let pressed = $state<number | null>(null);
  const lensIndex = $derived(pressed ?? items.findIndex((item) => isActive(item.href)));
</script>

<nav
  class="glass-surface fixed inset-x-3 z-50 mx-auto flex max-w-md items-center justify-around rounded-[1.75rem] px-1"
  style="bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
  aria-label="Navigation principale"
>
  {#if lensIndex >= 0}
    <span
      class="nav-lens bg-primary/12 pointer-events-none absolute inset-y-1 left-1 rounded-[1.25rem]"
      style="width: calc((100% - 0.5rem) / {items.length}); transform: translateX({lensIndex * 100}%)"
      aria-hidden="true"
    ></span>
  {/if}
  {#each items as item, i (item.href)}
    {@const Icon = item.icon}
    <a
      href={item.href}
      aria-current={isActive(item.href) ? 'page' : undefined}
      onclick={() => (pressed = i)}
      class={`relative my-1 flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] py-1.5 no-underline transition-colors ${
        lensIndex === i ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon class="size-6 shrink-0" />
      <span class="max-w-full truncate px-1 text-[11px] font-medium">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  .nav-lens {
    transition: transform 380ms cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .nav-lens {
      transition: none;
    }
  }
</style>
