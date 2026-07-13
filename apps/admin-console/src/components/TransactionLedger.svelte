<script lang="ts">
  import { Search, Plus, Trash2, ArrowLeftRight, Check, AlertCircle, ChevronLeft, ChevronRight, MoreVertical, Edit2 } from 'lucide-svelte';

  interface Transaction {
    id: number;
    seasonId: string;
    type: 'recette' | 'depense' | 'transfert';
    accountId: 'current' | 'savings' | 'cash';
    destinationAccountId: 'current' | 'savings' | 'cash' | null;
    category: string | null;
    amount: number;
    date: string;
    paymentMethod: string;
    description: string;
    reference: string | null;
    memberId?: number | null;
    bankTransactionId?: number | null;
    memberName?: string | null;
    memberLicence?: string | null;
  }

  interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  interface BalanceReport {
    accountId: 'current' | 'savings' | 'cash';
    initialBalance: number;
    finalBalance: number;
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
    closed?: boolean;
  }

  interface Category {
    id: string;
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses: boolean;
  }

  let {
    transactions = [],
    pagination,
    seasonId,
    balances = [],
    seasons = [],
    categories = []
  }: {
    transactions: Transaction[];
    pagination: Pagination;
    seasonId: string;
    balances: BalanceReport[];
    seasons?: Season[];
    categories?: Category[];
  } = $props();

  // Saisie formulaire
  let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('1');
  let accountId = $state<'current' | 'savings' | 'cash'>('current');
  let destinationAccountId = $state<'current' | 'savings' | 'cash'>('cash');
  let paymentMethod = $state('virement');
  let description = $state('');
  let reference = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  // svelte-ignore state_referenced_locally
  let targetSeasonId = $state(seasonId);

  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);

  let editingId = $state<number | null>(null);
  let openDropdownId = $state<number | null>(null);

  function toggleDropdown(id: number, e: MouseEvent) {
    e.stopPropagation();
    if (openDropdownId === id) {
      openDropdownId = null;
    } else {
      openDropdownId = id;
    }
  }

  function startEdit(tx: Transaction, e: MouseEvent) {
    e.stopPropagation();
    editingId = tx.id;
    amount = (tx.amount / 100).toFixed(2);
    date = tx.date;
    category = tx.category || '1';
    accountId = tx.accountId;
    destinationAccountId = tx.destinationAccountId || 'cash';
    paymentMethod = tx.paymentMethod;
    description = tx.description;
    reference = tx.reference || '';
    targetSeasonId = tx.seasonId;
    showPanel = tx.type;
    openDropdownId = null;
  }

  $effect(() => {
    const handleGlobalClick = () => {
      openDropdownId = null;
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });

  const accountLabels = {
    current: 'Compte Courant',
    savings: 'Compte Livret',
    cash: 'Caisse Physique'
  };

  const methodLabels = {
    virement: 'Virement',
    cheque: 'Chèque',
    especes: 'Espèces',
    labaz: 'LABAZ',
    ancv: 'ANCV',
    pass_sport: "Pass'Sport",
    ticket_loisir: 'Ticket Loisir',
    up_loisir: 'Up & Loisir'
  };

  const fallbackCategories = [
    { id: '1', name: 'Adhésions & Inscriptions' },
    { id: '2', name: 'Sponsoring' },
    { id: '3', name: 'Subventions (aides publiques)' },
    { id: '4', name: 'Actions Jeunes (stages jeunes...)' },
    { id: '5', name: 'Tournois Senior' },
    { id: '6', name: 'Evénements & Buvettes' },
    { id: '7', name: 'Cordage (vente aux adhérents)' },
    { id: '8', name: 'Volants (vente ou achat)' },
    { id: '9', name: 'Salaires et Charges' },
    { id: '10', name: 'Matériel (hors cordages)' },
    { id: '11', name: 'Licences (versements fédération)' },
    { id: '12', name: 'Championnats (frais équipes)' },
    { id: '13', name: 'Stages & Formations' },
    { id: '14', name: 'Frais de fonctionnement & administratif' },
    { id: '15', name: 'Virements Internes (Transit)' }
  ];

  const activeCategories = $derived(
    categories && categories.length > 0
      ? categories.map(c => ({ id: c.id, name: c.adminLabel }))
      : fallbackCategories
  );

  function getAccountBalance(acc: 'current' | 'savings' | 'cash') {
    const match = balances.find(b => b.accountId === acc);
    return match ? (match.finalBalance / 100).toFixed(2) : '0.00';
  }

  async function handleAddTransaction(e: Event) {
    e.preventDefault();
    errorMsg = '';
    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      errorMsg = 'Le montant doit être un nombre positif.';
      return;
    }

    isSubmitting = true;
    try {
      const payload = editingId
        ? {
            action: 'update',
            id: editingId,
            updates: {
              seasonId: targetSeasonId,
              type: showPanel,
              accountId,
              destinationAccountId: showPanel === 'transfert' ? destinationAccountId : null,
              category: showPanel !== 'transfert' ? category : null,
              amount: Math.round(floatAmount * 100),
              date,
              paymentMethod,
              description,
              reference
            }
          }
        : {
            action: 'create',
            seasonId: targetSeasonId,
            type: showPanel,
            accountId,
            destinationAccountId: showPanel === 'transfert' ? destinationAccountId : null,
            category: showPanel !== 'transfert' ? category : null,
            amount: Math.round(floatAmount * 100), // conversion en centimes
            date,
            paymentMethod,
            description,
            reference
          };

      const res = await fetch('/admin/compta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Impossible d\'enregistrer la transaction');
      }

      window.location.reload();
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;

    try {
      const res = await fetch('/admin/compta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      if (!res.ok) throw new Error('Impossible de supprimer.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function changePage(newPage: number) {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    window.location.href = `/admin/compta?${params.toString()}`;
  }

  function applySeasonChange() {
    const params = new URLSearchParams(window.location.search);
    params.set('season', selectedSeason);
    params.set('page', '1');
    window.location.href = `/admin/compta?${params.toString()}`;
  }
</script>

<div class="space-y-6">
  <!-- Bandeau des Soldes -->
  <div class="grid gap-4 md:grid-cols-3">
    {#each Object.entries(accountLabels) as [key, label]}
      <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 class="text-sm font-medium text-muted-foreground">{label}</h3>
        <div class="text-3xl font-bold mt-2">{getAccountBalance(key as any)} €</div>
      </div>
    {/each}
  </div>

  <!-- Actions Bar -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold tracking-tight">Journal des écritures</h2>
      <select
        class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
        bind:value={selectedSeason}
        onchange={applySeasonChange}
      >
        {#each seasons as season}
          <option value={season.id}>{season.name}</option>
        {/each}
        {#if seasons.length === 0}
          <option value="25-26">Saison 2025-2026</option>
        {/if}
      </select>
      {#if isClosed}
        <span class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
          Saison clôturée (Lecture seule)
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-3">
      {#if !isClosed}
        <button
          onclick={() => { showPanel = 'recette'; amount = ''; description = ''; targetSeasonId = selectedSeason; editingId = null; }}
          class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow transition-colors cursor-pointer"
        >
          Saisir Recette
        </button>
        <button
          onclick={() => { showPanel = 'depense'; amount = ''; description = ''; targetSeasonId = selectedSeason; editingId = null; }}
          class="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-md hover:bg-destructive/90 shadow transition-colors cursor-pointer"
        >
          Saisir Dépense
        </button>
        <button
          onclick={() => { showPanel = 'transfert'; amount = ''; description = ''; targetSeasonId = selectedSeason; editingId = null; }}
          class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 shadow transition-colors cursor-pointer"
        >
          Virement Interne
        </button>
      {/if}
    </div>
  </div>

  <!-- Tableau -->
  <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <div class="overflow-x-auto min-h-[180px]">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
          <tr>
            <th class="p-4">Date</th>
            <th class="p-4">Type</th>
            <th class="p-4">Compte(s)</th>
            <th class="p-4">Catégorie</th>
            <th class="p-4">Libellé</th>
            <th class="p-4 text-right">Montant</th>
            <th class="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each transactions as tx}
            <tr class="hover:bg-muted/50 transition-colors">
              <td class="p-4">{tx.date}</td>
              <td class="p-4">
                {#if tx.type === 'recette'}
                  <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Recette</span>
                {:else if tx.type === 'depense'}
                  <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 text-destructive">Dépense</span>
                {:else}
                  <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary">Transfert</span>
                {/if}
              </td>
              <td class="p-4">
                {#if tx.type === 'transfert'}
                  <span class="text-xs">{accountLabels[tx.accountId]} ➔ {accountLabels[tx.destinationAccountId!]}</span>
                {:else}
                  <span class="text-xs">{accountLabels[tx.accountId]}</span>
                {/if}
              </td>
              <td class="p-4">{tx.category ? (activeCategories.find(c => c.id === tx.category)?.name || tx.category) : 'Transfert'}</td>
              <td class="p-4 font-medium">
                <div>{tx.description}</div>
                {#if tx.reference}
                  <div class="text-xs text-muted-foreground italic">Réf: {tx.reference}</div>
                {/if}
                <div class="flex flex-wrap gap-1.5 mt-1">
                  {#if tx.memberName}
                    <a href={`/admin/members/${tx.memberLicence}`} class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold hover:underline">
                      Adhérent : {tx.memberName}
                    </a>
                  {/if}
                  {#if tx.bankTransactionId}
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                      <Check class="w-2.5 h-2.5" />
                      Rapprochée (SG)
                    </span>
                  {/if}
                </div>
              </td>
              <td class="p-4 text-right font-bold">
                {#if tx.type === 'recette'}
                  <span class="text-emerald-600 dark:text-emerald-400">+{(tx.amount / 100).toFixed(2)} €</span>
                {:else if tx.type === 'depense'}
                  <span class="text-destructive">-{(tx.amount / 100).toFixed(2)} €</span>
                {:else}
                  <span class="text-muted-foreground">{(tx.amount / 100).toFixed(2)} €</span>
                {/if}
              </td>
              <td class="p-4 text-right relative">
                {#if !isClosed}
                  <div class="inline-block text-left">
                    <button 
                      onclick={(e) => toggleDropdown(tx.id, e)} 
                      class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center" 
                      aria-label="Actions"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </button>

                    {#if openDropdownId === tx.id}
                      <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border">
                        <button
                          onclick={(e) => startEdit(tx, e)}
                          class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                        >
                          <Edit2 class="w-3.5 h-3.5" />
                          Éditer
                        </button>
                        <button
                          onclick={() => handleDelete(tx.id)}
                          class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                          Supprimer
                        </button>
                      </div>
                    {/if}
                  </div>
                {/if}
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="7" class="p-8 text-center text-muted-foreground">Aucune écriture comptable pour cette saison.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div class="p-4 border-t border-border flex items-center justify-between">
      <div class="text-xs text-muted-foreground">
        Total : {pagination.total} transaction(s)
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs">
          Page {pagination.page} sur {pagination.totalPages}
        </span>
        <div class="flex gap-1">
          <button
            class="p-2 border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onclick={() => changePage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            class="p-2 border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onclick={() => changePage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modale de saisie coulissante -->
  {#if showPanel}
    <div class="fixed inset-0 z-50 flex justify-end">
      <button type="button" class="fixed inset-0 bg-black/40 border-0 cursor-default" onclick={() => showPanel = null} aria-label="Close modal"></button>
      <div class="relative w-full max-w-md bg-card border-l border-border h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
        <form onsubmit={handleAddTransaction} class="space-y-4">
          <h3 class="text-lg font-bold">
            {#if editingId}
              {#if showPanel === 'recette'}🟢 Modifier la recette{:else if showPanel === 'depense'}🔴 Modifier la dépense{:else}🔵 Modifier le virement interne{/if}
            {:else}
              {#if showPanel === 'recette'}🟢 Saisir une recette{:else if showPanel === 'depense'}🔴 Saisir une dépense{:else}🔵 Faire un virement interne{/if}
            {/if}
          </h3>

          {#if errorMsg}
            <div class="p-3 bg-destructive/15 border border-destructive text-destructive text-xs rounded-md flex items-center gap-2">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          {/if}

          <div>
            <label for="amount-input" class="block text-sm font-medium mb-1">Montant (€)</label>
            <input id="amount-input" type="number" step="0.01" min="0.01" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={amount} required />
          </div>

          <div>
            <label for="date-input" class="block text-sm font-medium mb-1">Date</label>
            <input id="date-input" type="date" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={date} required />
          </div>

          <div>
            <label for="season-select-panel" class="block text-sm font-medium mb-1">Saison d'affectation</label>
            <select id="season-select-panel" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary font-medium" bind:value={targetSeasonId}>
              {#each seasons as s}
                <option value={s.id}>{s.name}</option>
              {/each}
              {#if seasons.length === 0}
                <option value="25-26">Saison 2025-2026</option>
              {/if}
            </select>
          </div>

          {#if showPanel !== 'transfert'}
            <div>
              <label for="category-select" class="block text-sm font-medium mb-1">Catégorie</label>
              <select id="category-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={category}>
                {#each activeCategories as cat}
                  <option value={cat.id}>{cat.name}</option>
                {/each}
              </select>
            </div>
          {/if}

          <div>
            <label for="account-select" class="block text-sm font-medium mb-1">
              {#if showPanel === 'transfert'}Compte Source{:else}Compte financier{/if}
            </label>
            <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={accountId}>
              {#each Object.entries(accountLabels) as [key, label]}
                <option value={key}>{label}</option>
              {/each}
            </select>
          </div>

          {#if showPanel === 'transfert'}
            <div>
              <label for="dest-account-select" class="block text-sm font-medium mb-1">Compte Destinataire</label>
              <select id="dest-account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={destinationAccountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  {#if key !== accountId}
                    <option value={key}>{label}</option>
                  {/if}
                {/each}
              </select>
            </div>
          {/if}

          {#if showPanel !== 'transfert'}
            <div>
              <label for="payment-method-select" class="block text-sm font-medium mb-1">Moyen de paiement</label>
              <select id="payment-method-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={paymentMethod}>
                {#each Object.entries(methodLabels) as [key, label]}
                  <option value={key}>{label}</option>
                {/each}
              </select>
            </div>
          {/if}

          <div>
            <label for="description-input" class="block text-sm font-medium mb-1">Description / Motif</label>
            <input id="description-input" type="text" placeholder="Ex: Cotisation annuelle..." class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={description} required />
          </div>

          <div>
            <label for="ref-input" class="block text-sm font-medium mb-1">Référence (Optionnel)</label>
            <input id="ref-input" type="text" placeholder="Ex: Chèque n°1234, Virement..." class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={reference} />
          </div>

          <div class="flex gap-3 pt-4">
            <button type="submit" disabled={isSubmitting} class="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer">
              {isSubmitting ? 'Enregistrement...' : 'Valider'}
            </button>
            <button type="button" onclick={() => showPanel = null} class="px-4 py-2 border border-border text-sm font-medium rounded-md hover:bg-muted cursor-pointer">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
