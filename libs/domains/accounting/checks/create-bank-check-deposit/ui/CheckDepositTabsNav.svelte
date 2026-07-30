<script lang="ts">
  import { Camera, FileText } from '@lucide/svelte';
  import { Button, Tabs } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  interface Props {
    depositState: CheckDepositState;
    checksCount: number;
    checkDepositsCount: number;
  }

  let { depositState, checksCount, checkDepositsCount }: Props = $props();
</script>

<Tabs.List class="flex w-full sm:w-fit justify-start sm:justify-center overflow-x-auto no-scrollbar gap-2 sm:gap-4 no-print h-9 bg-transparent p-0">
  <Tabs.Trigger value="checks" class="data-[state=active]:bg-muted data-[state=active]:shadow-sm rounded-md px-3">
    Chèques reçus ({checksCount})
  </Tabs.Trigger>
  <Tabs.Trigger value="deposits" class="data-[state=active]:bg-muted data-[state=active]:shadow-sm rounded-md px-3">
    Bordereaux de remise ({checkDepositsCount})
  </Tabs.Trigger>
</Tabs.List>
