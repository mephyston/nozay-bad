<script lang="ts">
  import { Dialog, Tabs } from '@nba/ui';
  import CheckDepositForm from './CheckDepositForm.svelte';
  import CheckReconciliationForm from './CheckReconciliationForm.svelte';
  import CheckDepositTabsNav from './CheckDepositTabsNav.svelte';
  import CheckDepositTable from './CheckDepositTable.svelte';
  import CheckDepositListTable from './CheckDepositListTable.svelte';
  import AddCheckModal from './AddCheckModal.svelte';
  import ViewDepositSlipModal from './ViewDepositSlipModal.svelte';
  import { createCheckDepositState } from './check-deposit-state.svelte';
  import {
    handlePhotoSelected,
    handleAddCheck,
    handleDeleteCheck,
    handleCreateDeposit,
    handleDeleteDeposit,
    handleClearDeposit
  } from './check-deposit-api';
  import type { Check, CheckDeposit, Member, BankStatementLine, SeasonOption } from './check-deposit-types';

  interface Props {
    seasonId: string;
    seasons: SeasonOption[];
    checks: Check[];
    checkDeposits: CheckDeposit[];
    members: Member[];
    pendingBankTransactions: BankStatementLine[];
  }

  let props: Props = $props();
  const depositState = createCheckDepositState(() => props);


  $effect(() => {
    if (depositState.showCreateDepositModal) {
      const count = props.checkDeposits.length + 1;
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      depositState.depositReference = `REMISE-${today}-${count}`;
    }
  });

  const onPhotoSelected = (e: Event) => handlePhotoSelected(e, props.seasonId, depositState);
  const onAddCheck = (e: SubmitEvent) => handleAddCheck(e, props.seasonId, depositState);
  const onDeleteCheck = (id: number) => handleDeleteCheck(id, props.seasonId);
  const onCreateDeposit = (e: SubmitEvent) => handleCreateDeposit(e, props.seasonId, depositState);
  const onDeleteDeposit = (id: number) => handleDeleteDeposit(id, props.seasonId);
  const onClearDeposit = (e: SubmitEvent) => handleClearDeposit(e, props.seasonId, depositState);
</script>

<div class="space-y-6">
  <Tabs.Root value={depositState.activeTab} onValueChange={(v) => depositState.activeTab = v as any} class="space-y-6">
    {#snippet tabsNav()}
      <CheckDepositTabsNav
        {depositState}
        checksCount={props.checks.filter(c => c.status === 'received').length}
        checkDepositsCount={props.checkDeposits.length}
      />
    {/snippet}

    <Tabs.Content value="checks">
      <CheckDepositTable
        {depositState}
        seasonId={props.seasonId}
        seasons={props.seasons}
        {onDeleteCheck}
        {tabsNav}
      />
    </Tabs.Content>

    <Tabs.Content value="deposits">
      <CheckDepositListTable
        {depositState}
        seasonId={props.seasonId}
        seasons={props.seasons}
        checkDeposits={props.checkDeposits}
        {onDeleteDeposit}
        {tabsNav}
      />
    </Tabs.Content>
  </Tabs.Root>
</div>

<!-- Modal 1: Register Check with Photo upload & OCR -->
<AddCheckModal
  {depositState}
  seasonId={props.seasonId}
  {onAddCheck}
  {onPhotoSelected}
/>

<!-- Modal 2: Create Deposit Slip -->
<Dialog.Root bind:open={depositState.showCreateDepositModal}>
  <Dialog.Content class="w-full max-w-md p-0 bg-card border-border overflow-hidden">
    <Dialog.Header class="p-6 border-b border-border">
      <Dialog.Title>Générer un Bordereau de Remise</Dialog.Title>
      <Dialog.Description class="hidden">Création d'un bordereau de remise de chèque bancaire.</Dialog.Description>
    </Dialog.Header>

    <div class="p-6">
      <CheckDepositForm
        selectedChecksList={depositState.selectedChecksList}
        totalSelectedAmount={depositState.totalSelectedAmount}
        bind:depositReference={depositState.depositReference}
        bind:depositDate={depositState.depositDate}
        isSubmittingDeposit={depositState.isSubmittingDeposit}
        {onCreateDeposit}
      />
    </div>
  </Dialog.Content>
</Dialog.Root>

<!-- Modal 3: Clear Deposit slip with Bank Statement line -->
<Dialog.Root bind:open={depositState.showClearModal}>
  <Dialog.Content class="w-full max-w-md p-0 bg-card border-border overflow-hidden">
    <Dialog.Header class="p-6 border-b border-border">
      <Dialog.Title>Rapprocher la Remise de Chèques</Dialog.Title>
      <Dialog.Description class="hidden">Rapprochement bancaire pour la remise de chèques.</Dialog.Description>
    </Dialog.Header>

    {#if depositState.selectedDepositToClear}
      <div class="p-6">
        <CheckReconciliationForm
          selectedDepositToClear={depositState.selectedDepositToClear}
          pendingBankTransactions={props.pendingBankTransactions}
          bind:selectedBankTransactionId={depositState.selectedBankTransactionId}
          isSubmittingClear={depositState.isSubmittingClear}
          {onClearDeposit}
        />
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- Modal 4: View / Print deposit slip details -->
<ViewDepositSlipModal {depositState} />
