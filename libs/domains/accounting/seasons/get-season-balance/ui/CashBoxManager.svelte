<script lang="ts">
  import type { CashTransaction, Season } from './cashbox-types';
  import { categoryLabels } from './cashbox-types';
  import { submitCashMovement, deleteCashMovement } from './cashbox-actions';
  import CashBoxStatsCards from './CashBoxStatsCards.svelte';
  import CashBoxFormCard from './CashBoxFormCard.svelte';
  import CashBoxHistoryTable from './CashBoxHistoryTable.svelte';

  export * from './cashbox-types';
  export * from './cashbox-actions';

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
      amount = '';
      description = '';
    } else {
      errorMsg = res.error || 'Une erreur est survenue.';
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCashMovement(id);
    } catch (err: any) {
      alert(err.message);
    }
  }
</script>

<div class="space-y-6">
  <CashBoxStatsCards {initialBalance} {totalIn} {totalOut} {currentBalance} />

  <div class="grid gap-6 md:grid-cols-5">
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

    <CashBoxHistoryTable
      {filteredTransactions}
      bind:searchTerm
      {isClosed}
      onDelete={handleDelete}
    />
  </div>
</div>
