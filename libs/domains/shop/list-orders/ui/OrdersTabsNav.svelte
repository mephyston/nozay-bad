<script lang="ts">
  import { Clock, Banknote, History } from "@lucide/svelte";
  import { Tabs } from "@nba/ui";

  let {
    createdCount,
    awaitingPaymentCount,
    historyCount
  }: {
    createdCount: number;
    awaitingPaymentCount: number;
    historyCount: number;
  } = $props();
</script>

<Tabs.List class="flex w-full sm:w-fit justify-start sm:justify-center overflow-x-auto no-scrollbar gap-2 sm:gap-4 no-print h-9 bg-transparent p-0">
  <Tabs.Trigger value="created" class="data-[state=active]:bg-muted data-[state=active]:shadow-sm rounded-md px-3 gap-2">
    <Clock class="h-4 w-4 shrink-0" />
    À valider ({createdCount})
  </Tabs.Trigger>
  <Tabs.Trigger value="awaiting_payment" class="data-[state=active]:bg-muted data-[state=active]:shadow-sm rounded-md px-3 gap-2">
    <Banknote class="h-4 w-4 shrink-0" />
    En attente de paiement ({awaitingPaymentCount})
  </Tabs.Trigger>
  <Tabs.Trigger value="history" class="data-[state=active]:bg-muted data-[state=active]:shadow-sm rounded-md px-3 gap-2">
    <History class="h-4 w-4 shrink-0" />
    Historique ({historyCount})
  </Tabs.Trigger>
</Tabs.List>
