<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { Input, Tabs, Badge } from '@nba/ui';
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

<div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
  <Tabs.List class="w-full sm:w-fit justify-start sm:justify-center overflow-x-auto no-scrollbar mx-auto sm:mx-0 no-print">
    <Tabs.Trigger value="pending">
      En attente
      {#if pendingCount > 0}
        <Badge class="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full h-auto">
          {pendingCount}
        </Badge>
      {/if}
    </Tabs.Trigger>
    <Tabs.Trigger value="history">
      Historique / Traités
    </Tabs.Trigger>
  </Tabs.List>

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
