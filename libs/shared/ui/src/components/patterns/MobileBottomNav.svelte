<script lang="ts">
  import { Menu, Landmark, ShoppingCart, Receipt } from '@lucide/svelte';
  import { hasPermission } from '@nba/iam-ui';
  
  let {
    permissions = [],
    onMenuClick = () => {}
  }: {
    permissions?: string[];
    onMenuClick?: () => void;
  } = $props();

  const canManageAccounting = $derived(
    hasPermission(permissions, '*') || 
    hasPermission(permissions, 'accounting:*') || 
    hasPermission(permissions, 'accounting:write')
  );

  const canManageShop = $derived(
    hasPermission(permissions, '*') || 
    hasPermission(permissions, 'shop:*') || 
    hasPermission(permissions, 'orders:*') || 
    hasPermission(permissions, 'orders:create')
  );

  const canManageExpenses = $derived(
    hasPermission(permissions, '*') || 
    hasPermission(permissions, 'expenses:*') ||
    hasPermission(permissions, 'expenses:create')
  );
</script>

<div class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-center justify-around pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
  <!-- Bouton Menu -->
  <button 
    type="button"
    class="flex flex-col items-center justify-center w-full py-3 gap-1 hover:bg-accent transition-colors cursor-pointer border-0 bg-transparent min-h-[56px]"
    onclick={onMenuClick}
  >
    <Menu class="w-6 h-6 text-muted-foreground" />
    <span class="text-[11px] font-medium text-muted-foreground">Menu</span>
  </button>

  {#if canManageAccounting}
    <!-- Enregistrer un chèque -->
    <a 
      href="/admin/accounting/cheques/list?action=new-cheque"
      class="flex flex-col items-center justify-center w-full py-3 gap-1 hover:bg-accent transition-colors decoration-transparent min-h-[56px]"
      onclick={(e) => {
        if (window.location.pathname === '/admin/accounting/cheques/list') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('open-new-cheque'));
        }
      }}
    >
      <Landmark class="w-6 h-6 text-muted-foreground" />
      <span class="text-[11px] font-medium text-muted-foreground">Chèques</span>
    </a>

  {/if}

  {#if canManageShop}
    <!-- Nouvelle Commande -->
    <a 
      href="/admin/shop/orders?action=new-order"
      class="flex flex-col items-center justify-center w-full py-3 gap-1 hover:bg-accent transition-colors decoration-transparent min-h-[56px]"
      onclick={(e) => {
        if (window.location.pathname.includes('/shop/orders')) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('open-new-order'));
        }
      }}
    >
      <ShoppingCart class="w-6 h-6 text-foreground" />
      <span class="text-[11px] font-medium text-foreground">Commande</span>
    </a>
  {/if}

  {#if canManageExpenses}
    <!-- Nouvelle Note de Frais -->
    <a 
      href="/admin/expenses?action=new-expense"
      class="flex flex-col items-center justify-center w-full py-3 gap-1 hover:bg-accent transition-colors decoration-transparent min-h-[56px]"
      onclick={(e) => {
        if (window.location.pathname.includes('/expenses')) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('open-new-expense'));
        }
      }}
    >
      <Receipt class="w-6 h-6 text-foreground" />
      <span class="text-[11px] font-medium text-foreground">Frais</span>
    </a>
  {/if}
</div>

<style>
  /* env(safe-area-inset-bottom) is useful for iOS notch/home indicator */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
</style>
