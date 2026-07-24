<script lang="ts">
  import { Clock, History, Search } from "@lucide/svelte";
  import { Button, Input } from "@nba/ui";

  let {
    activeTab = $bindable('pending'),
    searchTerm = $bindable(''),
    pendingCount,
    historyCount,
    onTabChange
  }: {
    activeTab: 'pending' | 'history';
    searchTerm: string;
    pendingCount: number;
    historyCount: number;
    onTabChange: (tab: 'pending' | 'history') => void;
  } = $props();
</script>

<div class="border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div class="flex gap-4">
    <Button
      variant="ghost"
      onclick={() => onTabChange('pending')}
      class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px flex items-center gap-1.5 rounded-none h-auto bg-transparent border-t-0 border-x-0 {activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
    >
      <Clock class="h-4 w-4" />
      Demandes en attente ({pendingCount})
    </Button>
    <Button
      variant="ghost"
      onclick={() => onTabChange('history')}
      class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px flex items-center gap-1.5 rounded-none h-auto bg-transparent border-t-0 border-x-0 {activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
    >
      <History class="h-4 w-4" />
      Historique ({historyCount})
    </Button>
  </div>

  <div class="relative w-full sm:w-64 pb-2 sm:pb-0">
    <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Rechercher une commande..."
      bind:value={searchTerm}
      class="pl-9 pr-3 py-1.5 w-full text-sm h-8"
    />
  </div>
</div>
