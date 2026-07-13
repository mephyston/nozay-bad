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
    category: string | null;
    bankTransactionId: number | null;
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
  let category = $state('adhesions_inscriptions');
  let paymentMethod = $state('virement');
  let selectedMemberId = $state<string>('');
  let amountToLink = $state<number>(0);

  // États du dropdown personnalisé (Searchable Select / Combobox)
  let isMemberDropdownOpen = $state(false);
  let isCategoryDropdownOpen = $state(false);
  let memberSearchQuery = $state('');
  let categorySearchQuery = $state('');

  const accountLabels = {
    current: 'Compte Courant',
    savings: 'Compte Livret',
    cash: 'Caisse Physique'
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

  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  let suggestions = $derived(selectedTx ? getSuggestions(selectedTx) : []);

  // Détecter les pièces déjà liées du grand livre et le solde restant
  let linkedGlTxs = $derived(selectedTx ? glTransactions.filter(gt => gt.bankTransactionId === selectedTx!.id) : []);
  let totalLinked = $derived(linkedGlTxs.reduce((sum, gt) => sum + Math.abs(gt.amount), 0));
  let remainingAmount = $derived(selectedTx ? Math.abs(selectedTx.amount) - totalLinked : 0);

  // Synchronisation du texte d'affichage des sélections
  let memberDisplayVal = $derived.by(() => {
    if (!selectedMemberId) return '';
    const m = members.find(x => x.id.toString() === selectedMemberId);
    return m ? `${m.lastName} ${m.firstName}` : '';
  });

  let categoryDisplayVal = $derived.by(() => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.name : '';
  });

  // Adhérents et catégories filtrées en temps réel
  let filteredMembers = $derived(
    memberSearchQuery.trim() === ''
      ? sortedMembers
      : sortedMembers.filter(m =>
          `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
        )
  );

  let filteredCategories = $derived(
    categorySearchQuery.trim() === ''
      ? categories
      : categories.filter(c => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
  );

  $effect(() => {
    if (selectedTx) {
      amountToLink = parseFloat((remainingAmount / 100).toFixed(2));
      memberSearchQuery = '';
      categorySearchQuery = '';
    }
  });

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
            amount: Math.round(amountToLink * 100),
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
    <!-- Zone d'Importation initiale -->
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
        <button type="submit" disabled={isSubmitting} class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow hover:bg-primary/95 cursor-pointer font-medium font-medium">
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
                      IA : {sug.memberName} ({categories.find(c => c.id === sug.category)?.name || sug.category})
                    </div>
                  {:else}
                    <div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-semibold text-muted-foreground">
                      IA : Opération diverse ({categories.find(c => c.id === sug.category)?.name || sug.category})
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

            <!-- Ventilation / Pièces déjà liées -->
            {#if linkedGlTxs.length > 0}
              <div class="border border-border rounded-xl p-4 bg-muted/30 space-y-2.5">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pièces déjà ventilées ({linkedGlTxs.length})</h4>
                <div class="space-y-1.5">
                  {#each linkedGlTxs as gt}
                    <div class="flex items-center justify-between text-xs p-2 bg-background border border-border rounded">
                      <div>
                        <div class="font-semibold text-foreground">{gt.description}</div>
                        <div class="text-[10px] text-muted-foreground">{categories.find(c => c.id === gt.category)?.name || 'Opération diverse'}</div>
                      </div>
                      <div class="font-bold text-emerald-600">{(Math.abs(gt.amount) / 100).toFixed(2)} €</div>
                    </div>
                  {/each}
                </div>
                <div class="text-xs font-bold text-right pt-2 border-t border-border text-foreground">
                  Reste à ventiler : {(remainingAmount / 100).toFixed(2)} €
                </div>
              </div>
            {/if}

            <!-- Étape 0 : Suggestion IA prioritaires (Seulement si rien n'a encore été ventilé) -->
            {#if selectedTx.aiSuggestions && linkedGlTxs.length === 0}
              {@const sug = JSON.parse(selectedTx.aiSuggestions)}
              <div class="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
                <div class="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles class="w-4 h-4" />
                  <span>SUGGESTION IA DE RAPPROCHEMENT</span>
                </div>
                {#if sug.memberId}
                  <p class="text-xs text-foreground">
                    Associer cette ligne de relevé à l'adhérent **{sug.memberName}** dans la catégorie **{categories.find(c => c.id === sug.category)?.name || sug.category}**.
                  </p>
                {:else}
                  <p class="text-xs text-foreground">
                    Enregistrer cette transaction comme opération diverse de type **{categories.find(c => c.id === sug.category)?.name || sug.category}** (pas d'adhérent détecté).
                  </p>
                {/if}
                <button
                  onclick={() => handleMatchWithAI(selectedTx!.id, sug.memberId, sug.category)}
                  class="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 cursor-pointer border-0 shadow-sm font-medium"
                >
                  Valider la suggestion IA
                </button>
              </div>
            {/if}

            <!-- Étape 1 : Suggestions d'association (Seulement si rien n'a encore été ventilé) -->
            {#if linkedGlTxs.length === 0}
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
            {/if}

            <!-- Étape 2 : Création d'une nouvelle écriture (Ventilation possible) -->
            {#if remainingAmount > 0}
              <div class="border border-border rounded-xl p-4 space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {linkedGlTxs.length > 0 ? 'Ventiler une nouvelle partie' : 'Créer et pointer manuellement'}
                </h4>
                
                <div class="space-y-3">
                  <!-- Ligne Adhérent & Recherche Combobox intégrée -->
                  <div class="space-y-1 relative">
                    <label for="member-input" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Adhérent</label>
                    <input
                      id="member-input"
                      type="text"
                      placeholder="Tapez pour rechercher un adhérent..."
                      class="w-full px-2.5 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary text-foreground font-medium pr-6"
                      value={isMemberDropdownOpen ? memberSearchQuery : memberDisplayVal}
                      oninput={(e) => {
                        isMemberDropdownOpen = true;
                        memberSearchQuery = (e.target as HTMLInputElement).value;
                      }}
                      onfocus={() => {
                        isMemberDropdownOpen = true;
                        memberSearchQuery = '';
                      }}
                      onblur={() => {
                        setTimeout(() => { isMemberDropdownOpen = false; }, 200);
                      }}
                    />
                    <span class="absolute right-2 top-6 text-muted-foreground pointer-events-none text-[8px]">▼</span>
                    
                    {#if isMemberDropdownOpen}
                      <div class="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded shadow-lg divide-y divide-border">
                        <button
                          type="button"
                          class="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted text-muted-foreground transition-colors font-medium border-0 cursor-pointer italic"
                          onmousedown={() => {
                            selectedMemberId = '';
                            memberSearchQuery = '';
                          }}
                        >
                          -- Aucun adhérent (Opération diverse) --
                        </button>
                        {#each filteredMembers as m}
                          <button
                            type="button"
                            class="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted text-foreground transition-colors font-medium border-0 cursor-pointer"
                            onmousedown={() => {
                              selectedMemberId = m.id.toString();
                              memberSearchQuery = `${m.lastName} ${m.firstName}`;
                            }}
                          >
                            {m.lastName} {m.firstName} (Dû : {(m.amountRemaining / 100).toFixed(2)} €)
                          </button>
                        {:else}
                          <div class="px-2.5 py-1.5 text-xs text-muted-foreground italic">Aucun résultat</div>
                        {/each}
                      </div>
                    {/if}
                  </div>

                  <!-- Ligne Catégorie Combobox intégrée et Montant -->
                  <div class="grid grid-cols-3 gap-2">
                    <div class="col-span-2 space-y-1 relative">
                      <label for="category-input" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Catégorie</label>
                      <input
                        id="category-input"
                        type="text"
                        placeholder="Tapez pour filtrer..."
                        class="w-full px-2.5 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary text-foreground font-medium pr-6"
                        value={isCategoryDropdownOpen ? categorySearchQuery : categoryDisplayVal}
                        oninput={(e) => {
                          isCategoryDropdownOpen = true;
                          categorySearchQuery = (e.target as HTMLInputElement).value;
                        }}
                        onfocus={() => {
                          isCategoryDropdownOpen = true;
                          categorySearchQuery = '';
                        }}
                        onblur={() => {
                          setTimeout(() => { isCategoryDropdownOpen = false; }, 200);
                        }}
                      />
                      <span class="absolute right-2 top-6 text-muted-foreground pointer-events-none text-[8px]">▼</span>
                      
                      {#if isCategoryDropdownOpen}
                        <div class="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded shadow-lg divide-y divide-border">
                          {#each filteredCategories as cat}
                            <button
                              type="button"
                              class="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted text-foreground transition-colors font-medium border-0 cursor-pointer"
                              onmousedown={() => {
                                category = cat.id;
                                categorySearchQuery = cat.name;
                              }}
                            >
                              {cat.name}
                            </button>
                          {:else}
                            <div class="px-2.5 py-1.5 text-xs text-muted-foreground italic">Aucun résultat</div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    
                    <div class="space-y-1">
                      <label for="amount-input" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Montant (€)</label>
                      <input
                        id="amount-input"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={(remainingAmount / 100).toFixed(2)}
                        class="w-full px-2.5 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary font-bold text-foreground h-[29px] mt-1"
                        bind:value={amountToLink}
                      />
                    </div>
                  </div>

                  <!-- Moyen de paiement -->
                  <div class="space-y-1">
                    <label for="method-select" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Moyen de paiement</label>
                    <select id="method-select" class="w-full px-2.5 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary text-foreground font-medium" bind:value={paymentMethod}>
                      <option value="virement">Virement</option>
                      <option value="cheque">Chèque</option>
                      <option value="especes">Espèces</option>
                    </select>
                  </div>
                </div>

                <button onclick={() => handleCreateAndMatch(selectedTx!)} class="w-full py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm cursor-pointer border-0 mt-2 font-medium">
                  {linkedGlTxs.length > 0 ? 'Enregistrer cette partie' : "Créer & lier l'écriture"}
                </button>
              </div>
            {:else}
              <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2">
                <Check class="w-4 h-4" />
                Opération entièrement rapprochée et validée !
              </div>
            {/if}
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
            <p class="text-xs max-w-xs font-medium">
              Cliquez sur **« Lancer l'analyse IA »** pour qualifier l'ensemble du relevé d'un coup, ou sélectionnez une ligne.
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
