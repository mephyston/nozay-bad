

<script lang="ts">
  import type { CashTransaction, Season } from './cashbox-types';
  import { categoryLabels } from './cashbox-types';
  import { submitCashMovement, deleteCashMovement } from './cashbox-actions';
  import CashBoxStatsCards from './CashBoxStatsCards.svelte';
  import CashBoxFormCard from './CashBoxFormCard.svelte';
  import CashBoxHistoryTable from './CashBoxHistoryTable.svelte';
  import { toast, Sheet } from '@nba/ui';

  let {
    initialBalance = 0,
    transactions = [],
    seasonId,
    seasons = []
  }: {
    initialBalance: number;
    transactions: CashTransaction[];
    seasonId: string;
    seasons?: Season[];
  } = $props();

  let type = $state<'recette' | 'depense'>('recette');
  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('evenements_buvettes');
  let description = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');
  let searchTerm = $state('');
  let showForm = $state(false);

  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);

  let totalIn = $derived(
    transactions.reduce((sum, tx) => {
      if (tx.type === 'recette') return sum + tx.amount;
      if (tx.type === 'transfert' && tx.destinationAccountId === 'cash') return sum + tx.amount;
      return sum;
    }, 0)
  );

  let totalOut = $derived(
    transactions.reduce((sum, tx) => {
      if (tx.type === 'depense') return sum + tx.amount;
      if (tx.type === 'transfert' && tx.accountId === 'cash') return sum + tx.amount;
      return sum;
    }, 0)
  );

  let currentBalance = $derived(initialBalance + totalIn - totalOut);

  let filteredTransactions = $derived(
    transactions.filter(tx => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        tx.description.toLowerCase().includes(term) ||
        (tx.category && categoryLabels[tx.category]?.toLowerCase().includes(term)) ||
        tx.amount.toString().includes(term) ||
        tx.date.includes(term)
      );
    })
  );

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    successMsg = '';
    isSubmitting = true;

    const res = await submitCashMovement({ seasonId, type, amount, date, category, description });
    isSubmitting = false;

    if (res.success) {
      successMsg = 'Mouvement de caisse enregistré avec succès !';
      toast.success(successMsg);
      amount = '';
      description = '';
      showForm = false;
    } else {
      errorMsg = res.error || 'Une erreur est survenue.';
      toast.error(errorMsg);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCashMovement(id);
      toast.success('Mouvement de caisse supprimé avec succès !');
    } catch (err: any) {
      toast.error(err.message);
    }
  }
</script>

<div class="space-y-6">
  <CashBoxStatsCards {initialBalance} {totalIn} {totalOut} {currentBalance} />

  <div class="grid gap-6 grid-cols-1">
    <CashBoxHistoryTable
      {filteredTransactions}
      bind:searchTerm
      {isClosed}
      {seasonId}
      {seasons}
      onDelete={handleDelete}
      onNewMovement={() => showForm = true}
    />
  </div>

  <Sheet.Root bind:open={showForm}>
    <Sheet.Content size="md" class="p-0 flex flex-col h-full overflow-hidden">
      <Sheet.Header class="p-6 border-b border-border">
        <Sheet.Title>Nouveau Mouvement de Caisse</Sheet.Title>
        <Sheet.Description class="hidden">Enregistrement d'une recette ou dépense en espèces.</Sheet.Description>
      </Sheet.Header>
      <div class="p-6 overflow-y-auto flex-grow">
        <CashBoxFormCard
          bind:type
          bind:amount
          bind:date
          bind:category
          bind:description
          {isClosed}
          {isSubmitting}
          {errorMsg}
          {successMsg}
          onSubmit={handleSubmit}
        />
      </div>
    </Sheet.Content>
  </Sheet.Root>
</div>
