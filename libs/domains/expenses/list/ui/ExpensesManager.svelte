<script lang="ts">
  import { FileText, Check, AlertCircle } from '@lucide/svelte';
  import { Alert, Card } from '@nba/ui';
  import type { Expense, Season, Category } from './expenses-types';
  import { getCategoryOptions, getCategoryLabels } from './expenses-types';
  import { ExpensesState } from './expenses-state.svelte';
  import * as api from './expenses-api';
  import ExpensesHeader from './ExpensesHeader.svelte';
  import ExpensePendingCard from './ExpensePendingCard.svelte';
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

  const state = new ExpensesState();
  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);

  const categoriesList = $derived(getCategoryOptions(categories));
  const categoryLabels = $derived(getCategoryLabels(categories));

  const pendingExpenses = $derived(
    expenses
      .filter(e => e.status === 'pending')
      .filter(e => 
        e.emitterName.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(state.searchTerm.toLowerCase())
      )
  );

  const historyExpenses = $derived(
    expenses
      .filter(e => e.status !== 'pending')
      .filter(e => 
        e.emitterName.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(state.searchTerm.toLowerCase())
      )
  );

  async function saveEdit(id: number) {
    const parsedAmount = parseFloat(state.editAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      state.errorMsg = "Veuillez saisir un montant supérieur à 0 €.";
      return;
    }

    state.isSaving = true;
    state.errorMsg = '';
    state.successMsg = '';

    try {
      state.successMsg = await api.saveExpenseEdit(id, {
        description: state.editDescription,
        category: state.editCategory,
        seasonId: state.editSeasonId,
        amount: Math.round(parsedAmount * 100)
      });
      state.editingId = null;
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      state.errorMsg = (err as Error).message || "Une erreur est survenue.";
    } finally {
      state.isSaving = false;
    }
  }

  async function handleAction(id: number, action: 'approve' | 'reject') {
    state.submittingId = id;
    state.errorMsg = '';
    state.successMsg = '';

    try {
      state.successMsg = await api.handleExpenseAction(id, action);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      state.errorMsg = (err as Error).message || "Une erreur est survenue.";
    } finally {
      state.submittingId = null;
    }
  }

  async function handleCancelValidation(id: number) {
    if (!confirm("Êtes-vous sûr de vouloir remettre cette note de frais en attente ? Cela annulera son remboursement en comptabilité.")) {
      return;
    }

    state.submittingId = id;
    state.errorMsg = '';
    state.successMsg = '';

    try {
      state.successMsg = await api.cancelExpenseValidation(id);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      state.errorMsg = (err as Error).message || "Une erreur est survenue.";
    } finally {
      state.submittingId = null;
    }
  }
</script>

<div class="space-y-6">
  <ExpensesHeader
    bind:searchTerm={state.searchTerm}
    bind:activeTab={state.activeTab}
    {expenses}
  />

  {#if state.successMsg}
    <Alert.Root class="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
      <Check class="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
      <Alert.Title class="text-emerald-600 dark:text-emerald-400">Succès</Alert.Title>
      <Alert.Description class="text-emerald-600 dark:text-emerald-400">{state.successMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if state.errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4.5 h-4.5" />
      <Alert.Title>Erreur</Alert.Title>
      <Alert.Description>{state.errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if state.activeTab === 'pending'}
    {#if pendingExpenses.length === 0}
      <Card.Root class="text-center py-16">
        <Card.Content>
          <FileText class="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
          <Card.Title class="text-lg font-bold text-foreground">Aucune note de frais en attente</Card.Title>
          <Card.Description class="text-sm text-muted-foreground mt-1">Toutes les dépenses soumises ont été validées ou rejetées.</Card.Description>
        </Card.Content>
      </Card.Root>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each pendingExpenses as exp (exp.id)}
          <ExpensePendingCard
            {exp}
            {isClosed}
            submittingId={state.submittingId}
            bind:editingId={state.editingId}
            bind:editDescription={state.editDescription}
            bind:editCategory={state.editCategory}
            bind:editSeasonId={state.editSeasonId}
            bind:editAmountStr={state.editAmountStr}
            isSaving={state.isSaving}
            {categoriesList}
            {categoryLabels}
            {seasons}
            onSelectPhoto={(url) => state.selectedPhoto = url}
            onStartEdit={(e) => state.startEdit(e)}
            onSaveEdit={saveEdit}
            onAction={handleAction}
          />
        {/each}
      </div>
    {/if}
  {:else}
    <ExpenseHistoryTable
      {historyExpenses}
      {isClosed}
      {categoryLabels}
      onSelectPhoto={(url) => state.selectedPhoto = url}
      onCancelValidation={handleCancelValidation}
    />
  {/if}
</div>

<ExpensePhotoModal bind:selectedPhoto={state.selectedPhoto} />
