<script lang="ts">
  import { Coins, Search } from '@lucide/svelte';
  import { Input, Badge } from '@nba/ui';
  import type { Expense } from './expenses-types';

  let {
    searchTerm = $bindable(''),
    activeTab = $bindable('pending'),
    expenses = []
  }: {
    searchTerm: string;
    activeTab: 'pending' | 'history';
    expenses: Expense[];
  } = $props();

  const pendingCount = $derived(expenses.filter(e => e.status === 'pending').length);
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
    <div class="flex items-center gap-2">
      <Coins class="w-5 h-5 text-primary" />
      <span class="font-semibold text-foreground">Dépenses de la saison</span>
    </div>
    <div class="relative w-full sm:w-72">
      <Input
        type="text"
        placeholder="Rechercher par nom, motif..."
        bind:value={searchTerm}
        class="pl-9 w-full"
      />
      <Search class="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
    </div>
  </div>

  <div class="border-b border-border flex items-center justify-between">
    <div class="flex gap-4">
      <button
        type="button"
        onclick={() => activeTab = 'pending'}
        class={`pb-3 text-sm font-semibold border-b-2 transition-all relative bg-transparent border-0 cursor-pointer ${
          activeTab === 'pending'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        En attente
        {#if pendingCount > 0}
          <Badge class="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full h-auto">
            {pendingCount}
          </Badge>
        {/if}
      </button>
      <button
        type="button"
        onclick={() => activeTab = 'history'}
        class={`pb-3 text-sm font-semibold border-b-2 transition-all bg-transparent border-0 cursor-pointer ${
          activeTab === 'history'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        Historique / Traités
      </button>
    </div>
  </div>
</div>
