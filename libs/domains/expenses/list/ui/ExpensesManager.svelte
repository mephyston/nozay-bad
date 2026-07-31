<script lang="ts">
  import { FileText, Check, AlertCircle } from '@lucide/svelte';
  import { Alert, Card, Tabs, uiConfirm, Badge, PageHeader, FormField, SearchableCombobox } from '@nba/ui';
  import type { Expense, Season, Category } from './expenses-types';
  import { getCategoryOptions, getCategoryLabels } from './expenses-types';
  import { ExpensesState } from './expenses-state.svelte';
  import * as api from './expenses-api';
  import ExpensePendingTable from './ExpensePendingTable.svelte';
  import ExpenseHistoryTable from './ExpenseHistoryTable.svelte';
  import ExpensePhotoModal from './ExpensePhotoModal.svelte';

  let {
    expenses = [],
    seasonId,
    seasons = [],
    categories = []
  }: {
    expenses: Expense[];
    seasonId: string;
    seasons?: Season[];
    categories?: Category[];
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
    const parsedAmount = parseFloat(viewState.editAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      viewState.errorMsg = "Veuillez saisir un montant supérieur à 0 €.";
      return;
    }

    viewState.isSaving = true;
    viewState.errorMsg = '';
    viewState.successMsg = '';

    try {
      viewState.successMsg = await api.saveExpenseEdit(id, {
        description: viewState.editDescription,
        category: viewState.editCategory,
        seasonId: viewState.editSeasonId,
        amount: Math.round(parsedAmount * 100)
      });
      viewState.editingId = null;
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      viewState.errorMsg = (err as Error).message || "Une erreur est survenue.";
    } finally {
      viewState.isSaving = false;
    }
  }

  async function handleAction(id: number, action: 'approve' | 'reject') {
    viewState.submittingId = id;
    viewState.errorMsg = '';
    viewState.successMsg = '';

    try {
      viewState.successMsg = await api.handleExpenseAction(id, action);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      viewState.errorMsg = (err as Error).message || "Une erreur est survenue.";
    } finally {
      viewState.submittingId = null;
    }
  }

  async function handleCancelValidation(id: number) {
    if (!(await uiConfirm("Êtes-vous sûr de vouloir remettre cette note de frais en attente ? Cela annulera son remboursement en comptabilité."))) {
      return;
    }

    viewState.submittingId = id;
    viewState.errorMsg = '';
    viewState.successMsg = '';

    try {
      viewState.successMsg = await api.cancelExpenseValidation(id);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      viewState.errorMsg = (err as Error).message || "Une erreur est survenue.";
    } finally {
      viewState.submittingId = null;
    }
  }

  const pendingCount = $derived(expenses.filter(e => e.status === 'pending').length);
  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);

  $effect(() => {
    if (selectedSeason !== seasonId) {
      const params = new URLSearchParams(window.location.search);
      params.set('season', selectedSeason);
      window.location.href = `/admin/expenses?${params.toString()}`;
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

  <Tabs.Root value={viewState.activeTab} onValueChange={(v) => viewState.activeTab = v as any} class="space-y-6">
    {#snippet tabsNav()}
      <Tabs.List class="w-full sm:w-fit justify-start sm:justify-center overflow-x-auto no-scrollbar mx-auto sm:mx-0 no-print">
        <Tabs.Trigger value="pending">
          En attente
          {#if pendingCount > 0}
            <Badge size="xs" shape="pill" class="ml-1.5">
              {pendingCount}
            </Badge>
          {/if}
        </Tabs.Trigger>
        <Tabs.Trigger value="history">
          Historique / Traités
        </Tabs.Trigger>
      </Tabs.List>
    {/snippet}

    {#snippet toolbarFilters()}
        <FormField id="filter-season" label="Saison">
        <SearchableCombobox id="filter-season" items={seasons.map((s) => ({ label: s.name, value: String(s.id) }))} bind:value={selectedSeason} />
      </FormField>
    {/snippet}

    {#if viewState.successMsg}
        <Alert.Root variant="success">
        <Check class="w-4.5 h-4.5" />
        <Alert.Title>Succès</Alert.Title>
        <Alert.Description>{viewState.successMsg}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if viewState.errorMsg}
      <Alert.Root variant="destructive">
        <AlertCircle class="w-4.5 h-4.5" />
        <Alert.Title>Erreur</Alert.Title>
        <Alert.Description>{viewState.errorMsg}</Alert.Description>
      </Alert.Root>
    {/if}

    <Tabs.Content value="pending">
      <ExpensePendingTable
        {pendingExpenses}
        {isClosed}
        submittingId={viewState.submittingId}
        bind:editingId={viewState.editingId}
        bind:editDescription={viewState.editDescription}
        bind:editCategory={viewState.editCategory}
        bind:editSeasonId={viewState.editSeasonId}
        bind:editAmountStr={viewState.editAmountStr}
        isSaving={viewState.isSaving}
        {categoriesList}
        {categoryLabels}
        {seasons}
        bind:searchTerm={viewState.searchTerm}
        {tabsNav}
        {toolbarFilters}
        onSelectPhoto={(url) => viewState.selectedPhoto = url}
        onStartEdit={(e) => viewState.startEdit(e)}
        onSaveEdit={saveEdit}
        onAction={handleAction}
      />
    </Tabs.Content>
    <Tabs.Content value="history">
      <ExpenseHistoryTable
        {historyExpenses}
        {isClosed}
        {categoryLabels}
        bind:searchTerm={viewState.searchTerm}
        {tabsNav}
        {toolbarFilters}
        onSelectPhoto={(url) => viewState.selectedPhoto = url}
        onCancelValidation={handleCancelValidation}
      />
    </Tabs.Content>
  </Tabs.Root>
</div>

<ExpensePhotoModal bind:selectedPhoto={viewState.selectedPhoto} />
