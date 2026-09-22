<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import { Alert, uiConfirm, Badge, PageHeader, softNavigate, submitForm } from '@nba/ui';
  import type { Expense, Season, Category } from './expenses-types';
  import { getCategoryOptions, getCategoryLabels } from './expenses-types';
  import { ExpensesState } from './expenses-state.svelte';
  import * as api from './expenses-api';
  import { onMount } from 'svelte';
  import ExpensePendingTable from './ExpensePendingTable.svelte';
  import ExpenseHistoryTable from './ExpenseHistoryTable.svelte';
  import ExpensePhotoModal from './ExpensePhotoModal.svelte';
  import AdminExpenseForm from './AdminExpenseForm.svelte';
  import ExpensesToolbar from './ExpensesToolbar.svelte';
  import ExpenseEditSheet from './ExpenseEditSheet.svelte';

  let {
    expenses = [],
    seasonId,
    seasons = [],
    categories = [],
    members = [],
    initialAction = null
  }: {
    expenses: Expense[];
    seasonId: string;
    seasons?: Season[];
    categories?: Category[];
    members?: any[];
    initialAction?: string | null;
  } = $props();

  const viewState = new ExpensesState();
  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);

  const categoriesList = $derived(getCategoryOptions(categories));
  const categoryLabels = $derived(getCategoryLabels(categories));

  const pendingExpenses = $derived(
    expenses
      .filter(e => e.status === 'pending')
      .filter(e => 
        e.emitterName.toLowerCase().includes(viewState.searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(viewState.searchTerm.toLowerCase())
      )
  );

  const historyExpenses = $derived(
    expenses
      .filter(e => e.status !== 'pending')
      .filter(e => 
        e.emitterName.toLowerCase().includes(viewState.searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(viewState.searchTerm.toLowerCase())
      )
  );

  async function saveEdit(id: number) {
    viewState.isSaving = true;
    viewState.errorMsg = '';

    await submitForm({
      validate: () => {
        const parsedAmount = parseFloat(viewState.editAmountStr);
        return isNaN(parsedAmount) || parsedAmount <= 0 ? "Veuillez saisir un montant supérieur à 0 €." : null;
      },
      submit: () => api.saveExpenseEdit(id, {
        description: viewState.editDescription,
        category: viewState.editCategory,
        seasonId: viewState.editSeasonId,
        amount: Math.round(parseFloat(viewState.editAmountStr) * 100)
      }),
      success: (message) => message,
      close: () => { viewState.editingId = null; },
      onError: (message) => { viewState.errorMsg = message; }
    });

    viewState.isSaving = false;
  }

  async function handleAction(id: number, action: 'approve' | 'reject') {
    viewState.submittingId = id;
    viewState.errorMsg = '';

    await submitForm({
      submit: () => api.handleExpenseAction(id, action),
      success: (message) => message,
      onError: (message) => { viewState.errorMsg = message; }
    });

    viewState.submittingId = null;
  }

  async function handleCancelValidation(id: number) {
    if (!(await uiConfirm("Êtes-vous sûr de vouloir remettre cette note de frais en attente ? Cela annulera son remboursement en comptabilité."))) {
      return;
    }

    viewState.submittingId = id;
    viewState.errorMsg = '';

    await submitForm({
      submit: () => api.cancelExpenseValidation(id),
      success: (message) => message,
      onError: (message) => { viewState.errorMsg = message; }
    });

    viewState.submittingId = null;
  }

  const pendingCount = $derived(expenses.filter(e => e.status === 'pending').length);
  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);

  $effect(() => {
    if (selectedSeason !== seasonId) {
      const params = new URLSearchParams(window.location.search);
      params.set('season', selectedSeason);
      softNavigate(`/admin/expenses?${params.toString()}`);
    }
  });

  let isCreateSheetOpen = $state(initialAction === 'new-expense');

  onMount(() => {
    const handleOpenNewExpense = () => isCreateSheetOpen = true;
    window.addEventListener('open-new-expense', handleOpenNewExpense);
    return () => window.removeEventListener('open-new-expense', handleOpenNewExpense);
  });

  $effect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new-expense') {
        params.delete('action');
        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  });
</script>

<div class="space-y-6">
  <PageHeader 
    title="Notes de frais" 
    description="Validation, modification et remboursement des notes de frais des membres du club."
  >
    {#snippet actions()}
      {#if isClosed}
        <span class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
          Saison clôturée (Lecture seule)
        </span>
      {/if}
    {/snippet}
  </PageHeader>

  {#snippet barreDOutils()}
    <ExpensesToolbar
      bind:searchTerm={viewState.searchTerm}
      bind:selectedSeason
      bind:activeTab={viewState.activeTab}
      {seasons}
      {pendingCount}
      historyCount={historyExpenses.length}
      resultCount={viewState.activeTab === 'pending' ? pendingExpenses.length : historyExpenses.length}
      {isClosed}
      exportHref={`/admin/accounting/reports?season=${seasonId}&export=expenses`}
      onCreate={() => (isCreateSheetOpen = true)}
    />
  {/snippet}

    {#if viewState.errorMsg}
      <Alert.Root variant="destructive">
        <AlertCircle class="w-4.5 h-4.5" />
        <Alert.Title>Erreur</Alert.Title>
        <Alert.Description>{viewState.errorMsg}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if viewState.activeTab === 'pending'}
      <ExpensePendingTable
        {pendingExpenses}
        {isClosed}
        submittingId={viewState.submittingId}
        {categoryLabels}
        toolbar={barreDOutils}
        onSelectPhoto={(url) => viewState.selectedPhoto = url}
        onStartEdit={(e) => viewState.startEdit(e)}
        onAction={handleAction}
      />
    {:else}
      <ExpenseHistoryTable
        {historyExpenses}
        {isClosed}
        {categoryLabels}
        toolbar={barreDOutils}
        onSelectPhoto={(url) => viewState.selectedPhoto = url}
        onCancelValidation={handleCancelValidation}
      />
    {/if}
</div>

<ExpenseEditSheet
  open={viewState.editingId !== null}
  expense={pendingExpenses.find((e) => e.id === viewState.editingId) ?? null}
  bind:editDescription={viewState.editDescription}
  bind:editCategory={viewState.editCategory}
  bind:editSeasonId={viewState.editSeasonId}
  bind:editAmountStr={viewState.editAmountStr}
  isSaving={viewState.isSaving}
  {categoriesList}
  {seasons}
  onSelectPhoto={(url) => (viewState.selectedPhoto = url)}
  onSave={saveEdit}
  onClose={() => (viewState.editingId = null)}
/>

<ExpensePhotoModal bind:selectedPhoto={viewState.selectedPhoto} />

<AdminExpenseForm
  bind:open={isCreateSheetOpen}
  activeSeasonId={seasonId}
  {members}
  {categories}
/>
