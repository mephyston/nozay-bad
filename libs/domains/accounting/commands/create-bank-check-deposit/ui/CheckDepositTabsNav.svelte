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

<div class="border-b border-border flex items-center justify-between">
  <Tabs.List class="flex gap-4 no-print">
    <Tabs.Trigger value="checks">
      Chèques reçus ({checksCount})
    </Tabs.Trigger>
    <Tabs.Trigger value="deposits">
      Bordereaux de Remise ({checkDepositsCount})
    </Tabs.Trigger>
  </Tabs.List>

  {#if depositState.activeTab === 'checks' && !depositState.isClosed}
    <div class="flex gap-2 mb-2">
      <Button
        onclick={() => depositState.showAddCheckModal = true}
        class="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
      >
        <Camera class="h-4 w-4" />
        Enregistrer un Chèque
      </Button>

      {#if depositState.selectedChecksList.length > 0}
        <Button
          onclick={() => depositState.showCreateDepositModal = true}
          class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm animate-pulse"
        >
          <FileText class="h-4 w-4" />
          Remise de {depositState.selectedChecksList.length} chèque(s) ({(depositState.totalSelectedAmount / 100).toFixed(2)} €)
        </Button>
      {/if}
    </div>
  {/if}
</div>
