<script lang="ts">
  import { Search, Plus, Trash2, ArrowLeftRight, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-svelte';

  interface Transaction {
    id: number;
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
  }

  let {
    transactions = [],
    pagination,
    seasonId,
    balances = [],
    seasons = []
  }: {
    transactions: Transaction[];
    pagination: Pagination;
    seasonId: string;
    balances: BalanceReport[];
    seasons?: Season[];
  } = $props();

  // Saisie formulaire
  let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('adhesions_inscriptions');
  let accountId = $state<'current' | 'savings' | 'cash'>('current');
  let destinationAccountId = $state<'current' | 'savings' | 'cash'>('cash');
  let paymentMethod = $state('virement');
  let description = $state('');
  let reference = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);

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

  const categories = [
    { id: 'adhesions_inscriptions', name: 'Adhésions & Inscriptions' },
    { id: 'sponsoring', name: 'Sponsoring' },
    { id: 'subventions', name: 'Subventions (aides publiques)' },
    { id: 'actions_jeunes', name: 'Actions Jeunes (stages jeunes...)' },
    { id: 'tournois_senior', name: 'Tournois Senior' },
    { id: 'evenements_buvettes', name: 'Evénements & Buvettes' },
    { id: 'cordage_vente', name: 'Cordage (vente aux adhérents)' },
    { id: 'volants', name: 'Volants (vente ou achat)' },
    { id: 'salaires_charges', name: 'Salaires et Charges' },
    { id: 'materiel_club', name: 'Matériel (hors cordages)' },
    { id: 'licences_federation', name: 'Licences (versements fédération)' },
    { id: 'championnats', name: 'Championnats (frais équipes)' },
    { id: 'stages_formations', name: 'Stages & Formations' },
    { id: 'fonctionnement_administratif', name: 'Frais de fonctionnement & administratif' }
  ];

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
      const res = await fetch('/admin/compta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          seasonId,
          type: showPanel,
          accountId,
          destinationAccountId: showPanel === 'transfert' ? destinationAccountId : null,
          category: showPanel !== 'transfert' ? category : null,
          amount: Math.round(floatAmount * 100), // conversion en centimes
          date,
          paymentMethod,
          description,
          reference
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Impossible de créer la transaction');
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
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={() => { showPanel = 'recette'; amount = ''; description = ''; }}
        class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow transition-colors cursor-pointer"
      >
        Saisir Recette
      </button>
      <button
        onclick={() => { showPanel = 'depense'; amount = ''; description = ''; }}
        class="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-md hover:bg-destructive/90 shadow transition-colors cursor-pointer"
      >
        Saisir Dépense
      </button>
      <button
        onclick={() => { showPanel = 'transfert'; amount = ''; description = ''; }}
        class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 shadow transition-colors cursor-pointer"
      >
        Virement Interne
      </button>
    </div>
  </div>

  <!-- Tableau -->
  <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <div class="overflow-x-auto">
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
              <td class="p-4">{tx.category ? (categories.find(c => c.id === tx.category)?.name || tx.category) : 'Transfert'}</td>
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
              <td class="p-4 text-right">
                <button onclick={() => handleDelete(tx.id)} class="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer" aria-label="Supprimer">
                  <Trash2 class="w-4 h-4" />
                </button>
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
            {#if showPanel === 'recette'}🟢 Saisir une recette{:else if showPanel === 'depense'}🔴 Saisir une dépense{:else}🔵 Faire un virement interne{/if}
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

          {#if showPanel !== 'transfert'}
            <div>
              <label for="category-select" class="block text-sm font-medium mb-1">Catégorie</label>
              <select id="category-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={category}>
                {#each categories as cat}
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
