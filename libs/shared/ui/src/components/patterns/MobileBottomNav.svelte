<script lang="ts">
  import { Menu, FileCheck, Landmark, Coins } from '@lucide/svelte';
  import { hasPermission } from '@nba/iam-ui';
  
  let {
    permissions = [],
    onMenuClick = () => {}
  }: {
    permissions?: string[];
    onMenuClick?: () => void;
  } = $props();

  const canWriteAccounting = $derived(
    hasPermission(permissions, '*') || 
    hasPermission(permissions, 'accounting:*') || 
    hasPermission(permissions, 'accounting:write')
  );
</script>

<div class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-center justify-around pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
  <!-- Bouton Menu -->
  <button 
    type="button"
    class="flex flex-col items-center justify-center w-full py-2 gap-1 hover:bg-accent transition-colors cursor-pointer border-0 bg-transparent"
    onclick={onMenuClick}
  >
    <Menu class="w-5 h-5 text-muted-foreground" />
    <span class="text-[10px] font-medium text-muted-foreground">Menu</span>
  </button>

  {#if canWriteAccounting}
    <!-- Enregistrer un chèque -->
    <a 
      href="/admin/accounting/cheques?action=new-cheque"
      class="flex flex-col items-center justify-center w-full py-2 gap-1 hover:bg-accent transition-colors decoration-transparent"
    >
      <Landmark class="w-5 h-5 text-muted-foreground" />
      <span class="text-[10px] font-medium text-muted-foreground">Chèques</span>
    </a>

    <!-- Saisir une dépense -->
    <a 
      href="/admin/accounting?action=new-depense"
      class="flex flex-col items-center justify-center w-full py-2 gap-1 hover:bg-accent transition-colors decoration-transparent"
    >
      <Coins class="w-5 h-5 text-destructive" />
      <span class="text-[10px] font-medium text-destructive">Dépense</span>
    </a>

    <!-- Saisir une recette -->
    <a 
      href="/admin/accounting?action=new-recette"
      class="flex flex-col items-center justify-center w-full py-2 gap-1 hover:bg-accent transition-colors decoration-transparent"
    >
      <FileCheck class="w-5 h-5 text-success" />
      <span class="text-[10px] font-medium text-success">Recette</span>
    </a>
  {/if}
</div>

<style>
  /* env(safe-area-inset-bottom) is useful for iOS notch/home indicator */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
</style>
