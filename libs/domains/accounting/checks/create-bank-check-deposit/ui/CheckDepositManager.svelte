<script lang="ts">
  import { Dialog, Tabs } from '@nba/ui';
  import CheckDepositForm from './CheckDepositForm.svelte';
  import CheckReconciliationForm from './CheckReconciliationForm.svelte';
  import CheckDepositTabsNav from './CheckDepositTabsNav.svelte';
  import CheckDepositTable from './CheckDepositTable.svelte';
  import CheckDepositListTable from './CheckDepositListTable.svelte';
  import CheckFormSheet from './CheckFormSheet.svelte';
  import { createCheckDepositState } from './check-deposit-state.svelte';
  import {
    handlePhotoSelected,
    handleSaveCheck,
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
    initialTab?: 'checks' | 'deposits';
    hideTabs?: boolean;
  }

  let props: Props = $props();
  const depositState = createCheckDepositState(() => props);


  import { onMount } from 'svelte';

  $effect(() => {
    if (depositState.showCreateDepositModal) {
      const count = props.checkDeposits.length + 1;
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      depositState.depositReference = `REMISE-${today}-${count}`;
    }
  });

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new-cheque' && !depositState.isClosed) {
      depositState.openCreateCheck();
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('action');
      window.history.replaceState({}, '', newUrl);
    }

    const handleCustomEvent = () => {
      if (!depositState.isClosed) depositState.openCreateCheck();
    };
    window.addEventListener('open-new-cheque', handleCustomEvent);
    return () => window.removeEventListener('open-new-cheque', handleCustomEvent);
  });

  const onPhotoSelected = (e: Event) => handlePhotoSelected(e, props.seasonId, depositState);
  const onSaveCheck = (e: SubmitEvent) => handleSaveCheck(e, props.seasonId, depositState);
  const onEditCheck = (check: Check) => depositState.openEditCheck(check);
  const onDeleteCheck = (id: number) => handleDeleteCheck(id, props.seasonId);
  const onCreateDeposit = (e: SubmitEvent) => handleCreateDeposit(e, props.seasonId, depositState);
  const onDeleteDeposit = (id: number) => handleDeleteDeposit(id, props.seasonId);
  const onClearDeposit = (e: SubmitEvent) => handleClearDeposit(e, props.seasonId, depositState);
</script>

<div class="space-y-6">
  <Tabs.Root value={depositState.activeTab} onValueChange={(v) => depositState.activeTab = v as any} class="space-y-6">
    {#snippet tabsNav()}
      {#if !props.hideTabs}
        <CheckDepositTabsNav
          {depositState}
          checksCount={props.checks.filter(c => c.status === 'received').length}
          checkDepositsCount={props.checkDeposits.length}
        />
      {/if}
    {/snippet}

    <Tabs.Content value="checks">
      <CheckDepositTable
        {depositState}
        seasonId={props.seasonId}
        seasons={props.seasons}
        {onEditCheck}
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

<!-- Sheet 1: enregistrer ou modifier un chèque (photo IA en création seulement) -->
<CheckFormSheet
  {depositState}
  {onSaveCheck}
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
