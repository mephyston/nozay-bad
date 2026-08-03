<script lang="ts">
  import { Receipt, ShoppingCart, FileText } from '@lucide/svelte';

  let { currentPath = '' }: { currentPath?: string } = $props();

  const items = [
    { href: '/note-de-frais', label: 'Frais', icon: Receipt },
    { href: '/boutique', label: 'Commande', icon: ShoppingCart },
    { href: '/attestation', label: 'Attestation', icon: FileText }
  ];
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
</nav>

<style>
  /* env(safe-area-inset-bottom) : encoche/indicateur home iOS */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
</style>
