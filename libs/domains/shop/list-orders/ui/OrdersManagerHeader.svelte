<script lang="ts">
  import { Clock, History, Search } from "@lucide/svelte";
  import { Input, Tabs } from "@nba/ui";

  let {
    searchTerm = $bindable(''),
    pendingCount,
    historyCount
  }: {
    searchTerm: string;
    pendingCount: number;
    historyCount: number;
  } = $props();
</script>

<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
  <Tabs.List class="w-full sm:w-auto justify-start sm:justify-center overflow-x-auto no-scrollbar">
    <Tabs.Trigger value="pending" class="px-6 gap-2">
      <Clock class="h-4 w-4 shrink-0" />
      Demandes en attente ({pendingCount})
    </Tabs.Trigger>
    <Tabs.Trigger value="history" class="px-6 gap-2">
      <History class="h-4 w-4 shrink-0" />
      Historique ({historyCount})
    </Tabs.Trigger>
  </Tabs.List>

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
