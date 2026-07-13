<script lang="ts">
  import { Upload, Check, AlertCircle, Trash2, ShieldAlert, Sparkles } from 'lucide-svelte';

  interface BankTransaction {
    id: number;
    fitid: string;
    accountId: 'current' | 'savings' | 'cash';
    amount: number;
    date: string;
    name: string;
    memo: string | null;
    status: 'pending' | 'reconciled' | 'ignored';
    aiSuggestions: string | null;
  }

  interface GLTransaction {
    id: number;
    type: 'recette' | 'depense' | 'transfert';
    accountId: 'current' | 'savings' | 'cash';
    amount: number;
    date: string;
    description: string;
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
  }

  interface Member {
    id: number;
    licence: string;
    lastName: string;
    firstName: string;
    amountRemaining: number;
  }

  let {
    bankTransactions = [],
    glTransactions = [],
    seasonId,
    seasons = [],
    members = []
  }: {
    bankTransactions: BankTransaction[];
    glTransactions: GLTransaction[];
    seasonId: string;
    seasons: Season[];
    members: Member[];
  } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  let selectedTx = $state<BankTransaction | null>(null);
  let isSubmitting = $state(false);
  let isAnalyzing = $state(false);
  let errorMsg = $state('');

  // Formulaire d'association/création
  let category = $state('buvette');
  let paymentMethod = $state('virement');
  let selectedMemberId = $state<string>('');

  const accountLabels = {
    current: 'Compte Courant',
    savings: 'Compte Livret',
    cash: 'Caisse Physique'
  };

  const categories = [
    { id: 'adhesions', name: 'Adhésions / Inscriptions' },
    { id: 'partenariats', name: 'Partenariats / Sponsoring' },
    { id: 'subventions', name: 'Subventions' },
    { id: 'buvette', name: 'Buvette' },
    { id: 'boutique', name: 'Boutique & Cordages' },
    { id: 'evenements', name: 'Événements (Action Jeunes...)' },
    { id: 'stages', name: 'Stages' },
    { id: 'salaires', name: 'Salaires' },
    { id: 'achats_boutique', name: 'Achats Boutique (Revente)' },
    { id: 'achats_club', name: 'Achats Club (Matériel)' },
    { id: 'licences_ffbad', name: 'Licences FFBad' },
    { id: 'championnats', name: 'Inscriptions Championnats' },
    { id: 'formations', name: 'Formations' },
    { id: 'divers_recette', name: 'Divers Recette' },
    { id: 'divers_depense', name: 'Divers Dépense' }
  ];

  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  let suggestions = $derived(selectedTx ? getSuggestions(selectedTx) : []);

  // Trouver les suggestions correspondantes du Grand Livre (même montant absolu et +/- 7 jours)
  function getSuggestions(bt: BankTransaction) {
    return glTransactions.filter(gt => {
      const matchesAmount = Math.abs(gt.amount) === Math.abs(bt.amount);
      if (!matchesAmount) return false;

      const btDate = new Date(bt.date).getTime();
      const gtDate = new Date(gt.date).getTime();
      const diffDays = Math.abs(btDate - gtDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });
  }

  async function handleImport(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) return;

    isSubmitting = true;
    errorMsg = '';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('seasonId', selectedSeason);

    try {
      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error(await res.text() || 'Erreur importation.');
      window.location.reload();
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  async function handleAnalyze() {
    isAnalyzing = true;
    errorMsg = '';
    try {
      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', season: selectedSeason })
      });
      if (!res.ok) throw new Error(await res.text() || 'Erreur analyse.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isAnalyzing = false;
    }
  }

  async function handleMatch(btId: number, transactionId: number) {
    isSubmitting = true;
    try {
      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match',
          btId,
          transactionId,
          memberId: selectedMemberId ? parseInt(selectedMemberId) : null
        })
      });
      if (!res.ok) throw new Error('Erreur association.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleCreateAndMatch(bt: BankTransaction) {
    isSubmitting = true;
    try {
      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          btId: bt.id,
          memberId: selectedMemberId ? parseInt(selectedMemberId) : null,
          transaction: {
            seasonId: selectedSeason,
            type: bt.amount < 0 ? 'depense' : 'recette',
            accountId: bt.accountId,
            category,
            amount: Math.abs(bt.amount),
            date: bt.date,
            paymentMethod,
            description: bt.name,
            reference: bt.fitid
          }
        })
      });
      if (!res.ok) throw new Error('Erreur création.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleMatchWithAI(btId: number, memberId: number | null, cat: string) {
    isSubmitting = true;
    try {
      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          btId,
          memberId,
          transaction: {
            seasonId: selectedSeason,
            type: selectedTx!.amount < 0 ? 'depense' : 'recette',
            accountId: selectedTx!.accountId,
            category: cat,
            amount: Math.abs(selectedTx!.amount),
            date: selectedTx!.date,
            paymentMethod: 'virement',
            description: selectedTx!.name,
            reference: selectedTx!.fitid
          }
        })
      });
      if (!res.ok) throw new Error('Erreur validation IA.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleIgnore(btId: number) {
    if (!confirm('Voulez-vous ignorer cette transaction bancaire ?')) return;
    isSubmitting = true;
    try {
      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ignore', btId })
      });
      if (!res.ok) throw new Error('Erreur ignore.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }
</script>

<div class="space-y-6">
  {#if bankTransactions.length === 0}
    <!-- Zone d'Importation initial -->
    <div class="bg-card border border-border rounded-xl p-8 shadow-sm max-w-xl animate-in fade-in-50 duration-200">
      <h2 class="text-lg font-semibold mb-4">Importer un relevé Société Générale</h2>
      {#if errorMsg}
        <div class="p-3 mb-4 bg-destructive/15 border border-destructive text-destructive text-sm rounded-md flex items-center gap-2">
          <AlertCircle class="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      {/if}
      <form onsubmit={handleImport} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="season-select" class="block text-xs font-semibold mb-1">Saison comptable</label>
            <select id="season-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium" bind:value={selectedSeason}>
              {#each seasons as s}
                <option value={s.id}>{s.name}</option>
              {/each}
              {#if seasons.length === 0}
                <option value="25-26">Saison 2025-2026</option>
              {/if}
            </select>
          </div>
          <div>
            <label for="file-input" class="block text-xs font-semibold mb-1">Fichier (.ofx)</label>
            <input id="file-input" type="file" accept=".ofx" class="w-full text-sm" required />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow hover:bg-primary/95 cursor-pointer">
          <Upload class="w-4 h-4" />
          {isSubmitting ? 'Importation en cours...' : 'Lancer l\'importation'}
        </button>
      </form>
    </div>
  {:else}
    <!-- Zone Rapprochement (Split-Screen) -->
    <div class="grid md:grid-cols-12 gap-6 h-[600px] animate-in fade-in-50 duration-200">
      <!-- Liste de gauche (7/12) -->
      <div class="md:col-span-7 bg-card border border-border rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
        <div class="p-4 border-b border-border bg-muted flex items-center justify-between">
          <span class="font-bold text-sm">Opérations bancaires en attente ({bankTransactions.length})</span>
          <button onclick={handleAnalyze} disabled={isAnalyzing} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-md shadow-sm cursor-pointer border-0">
            <Sparkles class="w-3.5 h-3.5" />
            {isAnalyzing ? 'Analyse IA...' : 'Lancer l\'analyse IA'}
          </button>
        </div>
        <div class="flex-1 overflow-y-auto divide-y divide-border">
          {#each bankTransactions as bt}
            <button
              type="button"
              onclick={() => { selectedTx = bt; selectedMemberId = ''; }}
              class="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4 border-0 cursor-pointer {selectedTx?.id === bt.id ? 'bg-muted border-l-4 border-l-primary' : ''}"
            >
              <div>
                <div class="font-bold text-sm text-foreground">{bt.name}</div>
                <div class="text-xs text-muted-foreground">{bt.date} • {accountLabels[bt.accountId]}</div>
                {#if bt.memo}
                  <div class="text-xs text-muted-foreground italic truncate max-w-md">{bt.memo}</div>
                {/if}
                {#if bt.aiSuggestions}
                  {@const sug = JSON.parse(bt.aiSuggestions)}
                  {#if sug.memberName}
                    <div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                      <Sparkles class="w-2.5 h-2.5" />
                      IA : {sug.memberName} ({sug.category})
                    </div>
                  {:else}
                    <div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-semibold text-muted-foreground">
                      IA : Opération diverse ({sug.category})
                    </div>
                  {/if}
                {/if}
              </div>
              <div class="font-bold text-sm shrink-0 {bt.amount < 0 ? 'text-destructive' : 'text-emerald-600'}">
                {bt.amount < 0 ? '' : '+'}{(bt.amount / 100).toFixed(2)} €
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Panneau Action de droite (5/12) -->
      <div class="md:col-span-5 bg-card border border-border rounded-xl shadow-sm p-6 h-full flex flex-col justify-between overflow-y-auto">
        {#if selectedTx}
          <div class="space-y-5">
            <div>
              <h3 class="font-bold text-lg">{selectedTx.name}</h3>
              <p class="text-xs text-muted-foreground mt-1">Ligne bancaire sélectionnée • ID: {selectedTx.fitid}</p>
              <div class="text-2xl font-bold mt-2 {selectedTx.amount < 0 ? 'text-destructive' : 'text-emerald-600'}">
                {selectedTx.amount < 0 ? '' : '+'}{(selectedTx.amount / 100).toFixed(2)} €
              </div>
            </div>

            <!-- Étape 0 : Suggestion IA prioritaires -->
            {#if selectedTx.aiSuggestions}
              {@const sug = JSON.parse(selectedTx.aiSuggestions)}
              <div class="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
                <div class="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles class="w-4 h-4" />
                  <span>SUGGESTION IA DE RAPPROCHEMENT</span>
                </div>
                {#if sug.memberId}
                  <p class="text-xs text-foreground">
                    Associer cette ligne de relevé à l'adhérent **{sug.memberName}** dans la catégorie **{sug.category}**.
                  </p>
                {:else}
                  <p class="text-xs text-foreground">
                    Enregistrer cette transaction comme opération diverse de type **{sug.category}** (pas d'adhérent détecté).
                  </p>
                {/if}
                <button
                  onclick={() => handleMatchWithAI(selectedTx!.id, sug.memberId, sug.category)}
                  class="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 cursor-pointer border-0 shadow-sm"
                >
                  Valider la suggestion IA
                </button>
              </div>
            {/if}

            <!-- Étape 1 : Suggestions d'association -->
            <div class="border border-border rounded-xl p-4 space-y-3 bg-muted/40">
              <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggestions du Grand Livre (+/- 7 jours)</h4>
              {#each suggestions as sug}
                <div class="flex items-center justify-between gap-2 p-2.5 bg-background border border-border rounded-md text-xs">
                  <div>
                    <div class="font-semibold text-foreground">{sug.description}</div>
                    <div class="text-muted-foreground">{sug.date} • {(sug.amount / 100).toFixed(2)} €</div>
                  </div>
                  <button onclick={() => handleMatch(selectedTx!.id, sug.id)} class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer border-0">
                    Associer
                  </button>
                </div>
              {:else}
                <p class="text-xs text-muted-foreground">Aucune écriture correspondante trouvée à +/- 7 jours.</p>
              {/each}
            </div>

            <!-- Étape 2 : Création d'une nouvelle écriture -->
            <div class="border border-border rounded-xl p-4 space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Créer et pointer manuellement</h4>
              
              <div class="space-y-2">
                <div>
                  <label for="member-select" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Associer à un adhérent</label>
                  <select id="member-select" class="w-full px-2 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary font-medium" bind:value={selectedMemberId}>
                    <option value="">-- Aucun adhérent (Opération diverse) --</option>
                    {#each sortedMembers as m}
                      <option value={m.id}>{m.lastName} {m.firstName} (Restant : {(m.amountRemaining / 100).toFixed(2)} €)</option>
                    {/each}
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="cat-select" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Catégorie</label>
                    <select id="cat-select" class="w-full px-2 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary" bind:value={category}>
                      {#each categories as cat}
                        <option value={cat.id}>{cat.name}</option>
                      {/each}
                    </select>
                  </div>
                  <div>
                    <label for="method-select" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Moyen de paiement</label>
                    <select id="method-select" class="w-full px-2 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary" bind:value={paymentMethod}>
                      <option value="virement">Virement</option>
                      <option value="cheque">Chèque</option>
                      <option value="especes">Espèces</option>
                    </select>
                  </div>
                </div>
              </div>

              <button onclick={() => handleCreateAndMatch(selectedTx!)} class="w-full py-1.5 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold shadow-sm cursor-pointer border-0">
                Créer & lier l'écriture
              </button>
            </div>
          </div>

          <!-- Boutons actions secondaires -->
          <div class="pt-4 border-t border-border flex justify-between gap-4">
            <button onclick={() => handleIgnore(selectedTx!.id)} class="flex-1 py-2 border border-border bg-transparent text-destructive hover:bg-destructive/10 text-xs font-semibold rounded cursor-pointer">
              Ignorer cette écriture
            </button>
            <button onclick={() => selectedTx = null} class="px-4 py-2 border border-border bg-transparent hover:bg-muted text-xs font-semibold rounded cursor-pointer">
              Fermer
            </button>
          </div>
        {:else}
          <div class="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
            <ShieldAlert class="w-8 h-8 opacity-40 text-primary animate-pulse" />
            <p class="text-sm font-semibold text-foreground font-medium">Rapprochement intelligent</p>
            <p class="text-xs max-w-xs">
              Cliquez sur **« Lancer l'analyse IA »** pour qualifier l'ensemble du relevé d'un coup, ou sélectionnez une ligne.
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
