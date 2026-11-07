<script lang="ts">
  import { ClipboardList, ReceiptText, ShoppingBasket } from '@lucide/svelte';

  /** La barre flottante de l'espace adhérent, avec les trois rubriques de la caisse. */
  type Tab = 'sell' | 'orders' | 'sales';

  let { active, ordersCount = 0, onSelect }: { active: Tab | null; ordersCount?: number; onSelect: (tab: Tab) => void } = $props();

  const items: { tab: Tab; label: string; icon: any }[] = [
    { tab: 'sell', label: 'Encaisser', icon: ShoppingBasket },
    { tab: 'orders', label: 'Commandes', icon: ClipboardList },
    { tab: 'sales', label: 'Ventes', icon: ReceiptText }
  ];
  const lensIndex = $derived(items.findIndex((item) => item.tab === active));
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
  {#each items as item, i (item.tab)}
    {@const Icon = item.icon}
    <button
      type="button"
      aria-current={active === item.tab ? 'page' : undefined}
      onclick={() => onSelect(item.tab)}
      class={`relative my-1 flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] py-1.5 transition-colors ${
        lensIndex === i ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon class="size-6 shrink-0" />
      <span class="max-w-full truncate px-1 text-[11px] font-medium">{item.label}</span>
      {#if item.tab === 'orders' && ordersCount > 0}
        <span class="bg-primary text-primary-foreground absolute top-0.5 left-1/2 ml-2 flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold">{ordersCount}</span>
      {/if}
    </button>
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
