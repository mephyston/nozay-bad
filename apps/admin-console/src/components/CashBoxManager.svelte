<script lang="ts">
  import { Wallet, TrendingUp, TrendingDown, Trash2, Calendar, FileText, Check, AlertCircle, Plus, Search } from 'lucide-svelte';

  interface CashTransaction {
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
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
  }

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

  // Form states
  let type = $state<'recette' | 'depense'>('recette');
  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('evenements_buvettes');
  let description = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');
  let searchTerm = $state('');

  // Selected Season
  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);

  const categoryLabels: Record<string, string> = {
    evenements_buvettes: 'Événements & Buvette',
    evenements_club: 'Événements & Buvette',
    boutique: 'Boutique & Cordages',
    adhesions_inscriptions: 'Adhésion',
    volants: 'Volants',
    materiel_club: 'Matériel club',
    divers_recette: 'Divers Recette',
    divers_depense: 'Divers Dépense'
  };

  // Calculations
  let totalIn = $derived(
    transactions.reduce((sum, tx) => {
      // Entrée si recette sur cash, ou virement vers cash
      if (tx.type === 'recette') return sum + tx.amount;
      if (tx.type === 'transfert' && tx.destinationAccountId === 'cash') return sum + tx.amount;
      return sum;
    }, 0)
  );

  let totalOut = $derived(
    transactions.reduce((sum, tx) => {
      // Sortie si depense sur cash, ou virement depuis cash
      if (tx.type === 'depense') return sum + tx.amount;
      if (tx.type === 'transfert' && tx.accountId === 'cash') return sum + tx.amount;
      return sum;
    }, 0)
  );

  let currentBalance = $derived(initialBalance + totalIn - totalOut);

  // Filtered transactions for rendering
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

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errorMsg = 'Le montant doit être supérieur à 0.';
      return;
    }

    isSubmitting = true;

    try {
      const res = await fetch('/admin/cash-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          seasonId: selectedSeason,
          type,
          accountId: 'cash',
          category,
          amount: Math.round(numAmount * 100),
          date,
          paymentMethod: 'especes',
          description
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || 'Erreur lors de l\'enregistrement.');
      }

      successMsg = 'Mouvement de caisse enregistré avec succès !';
      amount = '';
      description = '';
      
      // Petit délai pour l'animation puis rechargement
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce mouvement de caisse ?')) return;

    try {
      const res = await fetch('/admin/cash-box', {
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

  function applySeasonChange() {
    window.location.href = `/admin/cash-box?season=${selectedSeason}`;
  }
</script>

<div class="space-y-6">
  <!-- Header with Season Selector -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Suivi de la Caisse</h1>
      <p class="text-muted-foreground mt-1">
        Gérez l'argent liquide (pièces et billets) collecté lors des événements du club (buvette, tournois, etc.).
      </p>
    </div>
    <div class="flex items-center gap-3 shrink-0">
      <span class="text-sm font-semibold text-muted-foreground whitespace-nowrap">Saison&nbsp;:</span>
      <select
        bind:value={selectedSeason}
        onchange={applySeasonChange}
        class="px-3 py-1.5 border border-border bg-background rounded-md text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {#each seasons as s}
          <option value={s.id}>{s.name} {s.active ? '(Actuelle)' : ''}</option>
        {/each}
        {#if seasons.length === 0}
          <option value="25-26">Saison 2025-2026</option>
        {/if}
      </select>
    </div>
  </div>

  <!-- Statistiques Caisse -->
  <div class="grid gap-4 md:grid-cols-3">
    <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
      <div class="space-y-1">
        <h3 class="text-sm font-medium tracking-tight text-muted-foreground">Solde de la Caisse</h3>
        <div class="text-3xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
          {(currentBalance / 100).toFixed(2)} €
        </div>
        <p class="text-xs text-muted-foreground mt-1">Solde d'ouverture : {(initialBalance / 100).toFixed(2)} €</p>
      </div>
      <div class="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400">
        <Wallet class="w-6 h-6" />
      </div>
    </div>
    <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
      <div class="space-y-1">
        <h3 class="text-sm font-medium tracking-tight text-muted-foreground">Total Entrées (Buvette...)</h3>
        <div class="text-3xl font-bold mt-2 text-primary">
          +{(totalIn / 100).toFixed(2)} €
        </div>
        <p class="text-xs text-muted-foreground mt-1">Saison en cours</p>
      </div>
      <div class="p-3 bg-primary/10 rounded-full text-primary">
        <TrendingUp class="w-6 h-6" />
      </div>
    </div>
    <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
      <div class="space-y-1">
        <h3 class="text-sm font-medium tracking-tight text-muted-foreground">Total Sorties (Monnaie...)</h3>
        <div class="text-3xl font-bold mt-2 text-destructive">
          -{(totalOut / 100).toFixed(2)} €
        </div>
        <p class="text-xs text-muted-foreground mt-1">Saison en cours</p>
      </div>
      <div class="p-3 bg-destructive/10 rounded-full text-destructive">
        <TrendingDown class="w-6 h-6" />
      </div>
    </div>
  </div>

  <div class="grid gap-6 md:grid-cols-5">
    <!-- Formulaire Ajouter une Transaction (Col span 2) -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm md:col-span-2 space-y-4 h-fit">
      <h2 class="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2">
        <Plus class="w-5 h-5 text-primary" />
        Enregistrer un mouvement
      </h2>
      
      {#if errorMsg}
        <div class="p-3 bg-destructive/15 border border-destructive/30 text-destructive text-xs rounded-md flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      {/if}

      {#if successMsg}
        <div class="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-md flex items-center gap-2">
          <Check class="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="type" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Type de transaction</label>
          <select
            id="type"
            bind:value={type}
            onchange={() => {
              category = type === 'recette' ? 'evenements_buvettes' : 'evenements_club';
            }}
            class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="recette">Entrée (Recette - ex: Vente buvette)</option>
            <option value="depense">Sortie (Dépense - ex: Achat boissons)</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="amount" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Montant (€)</label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0"
              placeholder="0.00"
              bind:value={amount}
              class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label for="date" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Date</label>
            <input
              type="date"
              id="date"
              bind:value={date}
              class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
        </div>

        <div>
          <label for="category" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Catégorie</label>
          <select
            id="category"
            bind:value={category}
            class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {#if type === 'recette'}
              <option value="evenements_buvettes">Événements & Buvette</option>
              <option value="boutique">Boutique & Cordages</option>
              <option value="adhesions_inscriptions">Adhésion & Cotisation</option>
              <option value="divers_recette">Divers Recette</option>
            {:else}
              <option value="evenements_club">Événements & Buvette (achats)</option>
              <option value="materiel_club">Matériel club</option>
              <option value="divers_depense">Divers Dépense</option>
            {/if}
          </select>
        </div>

        <div>
          <label for="description" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description / Motif</label>
          <input
            type="text"
            id="description"
            placeholder="Ex: Recette buvette tournoi Jeunes"
            bind:value={description}
            class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer le mouvement'}
        </button>
      </form>
    </div>

    <!-- Historique des Mouvements (Col span 3) -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm md:col-span-3 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-2">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <FileText class="w-5 h-5 text-primary" />
          Derniers mouvements
        </h2>
        <div class="relative shrink-0">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            bind:value={searchTerm}
            class="pl-8 pr-3 py-1.5 w-full sm:w-48 border border-border bg-background rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left border-collapse">
          <thead>
            <tr class="border-b border-border text-xs text-muted-foreground font-bold uppercase tracking-wider">
              <th class="py-3 px-2">Date</th>
              <th class="py-3 px-2">Description</th>
              <th class="py-3 px-2">Catégorie</th>
              <th class="py-3 px-2 text-right">Montant</th>
              <th class="py-3 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each filteredTransactions as tx}
              <tr class="hover:bg-muted/40 transition-colors">
                <td class="py-3 px-2 text-xs whitespace-nowrap">{tx.date}</td>
                <td class="py-3 px-2 font-medium">
                  <div>{tx.description}</div>
                  {#if tx.type === 'transfert'}
                    <span class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Virement interne
                    </span>
                  {/if}
                </td>
                <td class="py-3 px-2 text-xs text-muted-foreground">
                  {tx.category ? (categoryLabels[tx.category] || tx.category) : 'Transfert'}
                </td>
                <td class="py-3 px-2 text-right font-bold">
                  {#if tx.type === 'recette'}
                    <span class="text-emerald-600 dark:text-emerald-400">+{(tx.amount / 100).toFixed(2)} €</span>
                  {:else if tx.type === 'depense'}
                    <span class="text-destructive">-{(tx.amount / 100).toFixed(2)} €</span>
                  {:else if tx.type === 'transfert' && tx.destinationAccountId === 'cash'}
                    <span class="text-emerald-600 dark:text-emerald-400">+{(tx.amount / 100).toFixed(2)} €</span>
                  {:else}
                    <span class="text-destructive">-{(tx.amount / 100).toFixed(2)} €</span>
                  {/if}
                </td>
                <td class="py-3 px-2 text-right">
                  {#if tx.type !== 'transfert'}
                    <button
                      onclick={() => handleDelete(tx.id)}
                      class="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                      aria-label="Supprimer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  {:else}
                    <span class="text-[10px] text-muted-foreground italic">Protégé</span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="5" class="py-8 text-center text-muted-foreground text-xs">
                  Aucun mouvement de caisse pour cette saison.
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
