<script lang="ts">
  import { Upload, Check, AlertCircle, Trash2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-svelte';

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
    category?: string | null;
    bankTransactionId?: number | null;
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
    closed?: boolean;
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
  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);
  let selectedTx = $state<BankTransaction | null>(null);
  let isSubmitting = $state(false);
  let isAnalyzing = $state(false);
  let isAnalyzingSingle = $state(false);
  let errorMsg = $state('');
  let showImportModal = $state(false);
  let selectedAccount = $state('auto');

  // Onglet actif à gauche
  let activeTab = $state<'pending' | 'reconciled' | 'ignored'>('pending');

  // Formulaire d'association/création
  let category = $state('1');
  let paymentMethod = $state('virement');
  let selectedMemberId = $state<string>('');
  let amountToLink = $state<number>(0);

  // États du dropdown personnalisé (Searchable Select / Combobox)
  let isMemberDropdownOpen = $state(false);
  let isCategoryDropdownOpen = $state(false);
  let memberSearchQuery = $state('');
  let categorySearchQuery = $state('');
  let targetSeasonId = $state(selectedSeason);

  const accountLabels = {
    current: 'Compte Courant',
    savings: 'Compte Livret',
    cash: 'Caisse Physique'
  };

  const categories = [
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

  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  let suggestions = $derived(selectedTx ? getSuggestions(selectedTx) : []);

  // Détecter les pièces déjà liées du grand livre et le solde restant
  let linkedGlTxs = $derived(selectedTx ? glTransactions.filter(gt => gt.bankTransactionId === selectedTx!.id) : []);
  let totalLinked = $derived(linkedGlTxs.reduce((sum, gt) => sum + Math.abs(gt.amount), 0));
  let remainingAmount = $derived(selectedTx ? Math.abs(selectedTx.amount) - totalLinked : 0);

  // Séparation par statut des transactions bancaires
  let pendingCount = $derived(bankTransactions.filter(t => t.status === 'pending').length);
  let reconciledCount = $derived(bankTransactions.filter(t => t.status === 'reconciled').length);
  let ignoredCount = $derived(bankTransactions.filter(t => t.status === 'ignored').length);
  let displayedTransactions = $derived(bankTransactions.filter(t => t.status === activeTab));

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
      targetSeasonId = selectedSeason;
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
    formData.append('accountId', selectedAccount);

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

  async function handleAnalyzeSingle(btId: number) {
    isAnalyzingSingle = true;
    errorMsg = '';
    try {
      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          season: selectedSeason,
          btId
        })
      });
      if (!res.ok) throw new Error(await res.text() || 'Erreur analyse.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isAnalyzingSingle = false;
    }
  }

  // Keep track of the currently focused transaction in sessionStorage
  $effect(() => {
    // If no transaction is selected, check sessionStorage
    if (!selectedTx && bankTransactions.length > 0) {
      const savedIdStr = sessionStorage.getItem('reconcile_active_bt_id');
      if (savedIdStr) {
        const savedId = parseInt(savedIdStr);
        const found = bankTransactions.find(t => t.id === savedId && t.status === activeTab);
        if (found) {
          selectedTx = found;
        } else {
          sessionStorage.removeItem('reconcile_active_bt_id');
        }
      }
    }
  });

  $effect(() => {
    if (selectedTx) {
      sessionStorage.setItem('reconcile_active_bt_id', selectedTx.id.toString());
    }
  });

  function prepareNextFocus(currentBtId: number, isFullyReconciled: boolean) {
    if (!isFullyReconciled) {
      sessionStorage.setItem('reconcile_active_bt_id', currentBtId.toString());
    } else {
      const index = displayedTransactions.findIndex(t => t.id === currentBtId);
      if (index !== -1) {
        // Option 1: Next pending transaction
        if (index + 1 < displayedTransactions.length) {
          sessionStorage.setItem('reconcile_active_bt_id', displayedTransactions[index + 1].id.toString());
        } 
        // Option 2: Previous pending transaction
        else if (index - 1 >= 0) {
          sessionStorage.setItem('reconcile_active_bt_id', displayedTransactions[index - 1].id.toString());
        } 
        // No more pending transactions
        else {
          sessionStorage.removeItem('reconcile_active_bt_id');
        }
      } else {
        sessionStorage.removeItem('reconcile_active_bt_id');
      }
    }
  }

  // Keyboard navigation for Member dropdown
  let memberHighlightedIndex = $state(-1);
  $effect(() => {
    if (!isMemberDropdownOpen) {
      memberHighlightedIndex = -1;
    }
  });
  $effect(() => {
    const total = filteredMembers.length + 1;
    if (memberHighlightedIndex >= total) {
      memberHighlightedIndex = total - 1;
    }
  });

  function selectMember(idStr: string, name: string) {
    selectedMemberId = idStr;
    memberSearchQuery = name;
    isMemberDropdownOpen = false;
    memberHighlightedIndex = -1;
  }

  function handleMemberKeyDown(e: KeyboardEvent) {
    if (!isMemberDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        isMemberDropdownOpen = true;
        memberHighlightedIndex = 0;
        e.preventDefault();
      }
      return;
    }

    const total = filteredMembers.length + 1;

    if (e.key === 'ArrowDown') {
      memberHighlightedIndex = (memberHighlightedIndex + 1) % total;
      e.preventDefault();
      scrollMemberOptionIntoView(memberHighlightedIndex);
    } else if (e.key === 'ArrowUp') {
      memberHighlightedIndex = (memberHighlightedIndex - 1 + total) % total;
      e.preventDefault();
      scrollMemberOptionIntoView(memberHighlightedIndex);
    } else if (e.key === 'Enter') {
      if (memberHighlightedIndex === 0) {
        selectMember('', '');
        e.preventDefault();
      } else if (memberHighlightedIndex > 0 && memberHighlightedIndex < total) {
        const m = filteredMembers[memberHighlightedIndex - 1];
        selectMember(m.id.toString(), `${m.lastName} ${m.firstName}`);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      isMemberDropdownOpen = false;
      e.preventDefault();
    }
  }

  function scrollMemberOptionIntoView(index: number) {
    setTimeout(() => {
      const container = document.getElementById('member-listbox');
      const option = document.getElementById(`member-option-${index}`);
      if (container && option) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const optionTop = option.offsetTop;
        const optionBottom = optionTop + option.clientHeight;

        if (optionTop < containerTop) {
          container.scrollTop = optionTop;
        } else if (optionBottom > containerBottom) {
          container.scrollTop = optionBottom - container.clientHeight;
        }
      }
    }, 0);
  }

  // Keyboard navigation for Category dropdown
  let categoryHighlightedIndex = $state(-1);
  $effect(() => {
    if (!isCategoryDropdownOpen) {
      categoryHighlightedIndex = -1;
    }
  });
  $effect(() => {
    const total = filteredCategories.length;
    if (categoryHighlightedIndex >= total) {
      categoryHighlightedIndex = total - 1;
    }
  });

  function selectCategory(id: string, name: string) {
    category = id;
    categorySearchQuery = name;
    isCategoryDropdownOpen = false;
    categoryHighlightedIndex = -1;
  }

  function handleCategoryKeyDown(e: KeyboardEvent) {
    if (!isCategoryDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        isCategoryDropdownOpen = true;
        categoryHighlightedIndex = 0;
        e.preventDefault();
      }
      return;
    }

    const total = filteredCategories.length;

    if (e.key === 'ArrowDown') {
      categoryHighlightedIndex = (categoryHighlightedIndex + 1) % total;
      e.preventDefault();
      scrollCategoryOptionIntoView(categoryHighlightedIndex);
    } else if (e.key === 'ArrowUp') {
      categoryHighlightedIndex = (categoryHighlightedIndex - 1 + total) % total;
      e.preventDefault();
      scrollCategoryOptionIntoView(categoryHighlightedIndex);
    } else if (e.key === 'Enter') {
      if (categoryHighlightedIndex >= 0 && categoryHighlightedIndex < total) {
        const cat = filteredCategories[categoryHighlightedIndex];
        selectCategory(cat.id, cat.name);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      isCategoryDropdownOpen = false;
      e.preventDefault();
    }
  }

  function scrollCategoryOptionIntoView(index: number) {
    setTimeout(() => {
      const container = document.getElementById('category-listbox');
      const option = document.getElementById(`category-option-${index}`);
      if (container && option) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const optionTop = option.offsetTop;
        const optionBottom = optionTop + option.clientHeight;

        if (optionTop < containerTop) {
          container.scrollTop = optionTop;
        } else if (optionBottom > containerBottom) {
          container.scrollTop = optionBottom - container.clientHeight;
        }
      }
    }, 0);
  }

  async function handleMatch(btId: number, transactionId: number) {
    isSubmitting = true;
    try {
      const matchedTx = glTransactions.find(t => t.id === transactionId);
      const matchedAmount = matchedTx ? Math.abs(matchedTx.amount) : 0;
      const isFullyReconciled = (remainingAmount - matchedAmount) <= 10;
      prepareNextFocus(btId, isFullyReconciled);

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
      const linkedAmount = Math.round(amountToLink * 100);
      const isFullyReconciled = (remainingAmount - linkedAmount) <= 10;
      prepareNextFocus(bt.id, isFullyReconciled);

      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          btId: bt.id,
          memberId: selectedMemberId ? parseInt(selectedMemberId) : null,
          transaction: {
            seasonId: targetSeasonId,
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
      prepareNextFocus(btId, true);

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

  async function handleDeletePart(txId: number) {
    if (!confirm('Voulez-vous supprimer cette écriture liée ? Le solde de l\'adhérent et le rapprochement seront mis à jour.')) return;
    isSubmitting = true;
    try {
      if (selectedTx) {
        prepareNextFocus(selectedTx.id, false);
      }

      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-transaction', txId })
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleUnignore(btId: number) {
    isSubmitting = true;
    try {
      prepareNextFocus(btId, false);

      const res = await fetch('/admin/compta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unignore', btId })
      });
      if (!res.ok) throw new Error('Erreur réactivation.');
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
      prepareNextFocus(btId, true);

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
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Rapprochement bancaire</h1>
        <p class="text-xs text-muted-foreground">Pointez les lignes de relevé Société Générale avec le grand livre ou les adhérents.</p>
      </div>
      {#if isClosed}
        <span class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
          Saison clôturée (Lecture seule)
        </span>
      {/if}
    </div>
    {#if bankTransactions.length > 0 && !isClosed}
      <button 
        type="button"
        onclick={() => showImportModal = true}
        class="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-md shadow cursor-pointer border-0"
      >
        <Upload class="w-3.5 h-3.5" />
        Importer un autre relevé (.ofx)
      </button>
    {/if}
  </div>

  {#if showImportModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="bg-card border border-border rounded-xl p-6 shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h2 class="text-md font-bold flex items-center gap-2">
            <Upload class="w-4 h-4 text-primary" />
            Importer un relevé Société Générale
          </h2>
          <button 
            type="button" 
            onclick={() => showImportModal = false} 
            class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {#if errorMsg}
          <div class="p-3 mb-4 bg-destructive/15 border border-destructive text-destructive text-xs rounded-md flex items-center gap-2">
            <AlertCircle class="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        {/if}

        <form onsubmit={handleImport} class="space-y-4">
          <div class="space-y-3">
            <div>
              <label for="season-select-modal" class="block text-xs font-semibold mb-1">Saison comptable</label>
              <select id="season-select-modal" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium" bind:value={selectedSeason}>
                {#each seasons as s}
                  <option value={s.id}>{s.name}</option>
                {/each}
                {#if seasons.length === 0}
                  <option value="25-26">Saison 2025-2026</option>
                {/if}
              </select>
            </div>
            <div>
              <label for="account-select-modal" class="block text-xs font-semibold mb-1">Compte de destination</label>
              <select id="account-select-modal" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium" bind:value={selectedAccount}>
                <option value="auto">Détecter automatiquement (depuis le fichier)</option>
                <option value="current">Compte Courant (Société Générale)</option>
                <option value="savings">Livret d'Épargne</option>
              </select>
            </div>
            <div>
              <label for="file-input-modal" class="block text-xs font-semibold mb-1">Fichier (.ofx)</label>
              <input id="file-input-modal" type="file" accept=".ofx" class="w-full text-sm" required />
            </div>
          </div>

          <div class="pt-4 border-t border-border flex justify-end gap-2">
            <button 
              type="button" 
              onclick={() => showImportModal = false} 
              class="px-4 py-2 border border-border hover:bg-accent text-foreground text-xs font-semibold rounded-md cursor-pointer bg-transparent"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md shadow hover:bg-primary/95 cursor-pointer border-0"
            >
              <Upload class="w-3.5 h-3.5" />
              {isSubmitting ? 'Importation...' : 'Lancer l\'importation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if bankTransactions.length === 0}
    <!-- Zone d'Importation initiale -->
    <div class="bg-card border border-border rounded-xl p-8 shadow-sm max-w-xl animate-in fade-in-50 duration-200">
      <h2 class="text-lg font-semibold mb-4 font-bold flex items-center gap-2">
        <Upload class="w-5 h-5 text-primary" />
        Importer un relevé Société Générale
      </h2>
      {#if errorMsg}
        <div class="p-3 mb-4 bg-destructive/15 border border-destructive text-destructive text-sm rounded-md flex items-center gap-2">
          <AlertCircle class="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      {/if}
      <form onsubmit={handleImport} class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label for="account-select" class="block text-xs font-semibold mb-1">Compte de destination</label>
            <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium" bind:value={selectedAccount}>
              <option value="auto">Détecter automatiquement</option>
              <option value="current">Compte Courant (Société Générale)</option>
              <option value="savings">Livret d'Épargne</option>
            </select>
          </div>
          <div>
            <label for="file-input" class="block text-xs font-semibold mb-1">Fichier (.ofx)</label>
            <input id="file-input" type="file" accept=".ofx" class="w-full text-sm mt-1.5" required />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow hover:bg-primary/95 cursor-pointer font-medium border-0">
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
        <!-- Barre d'Onglets -->
        <div class="flex border-b border-border bg-muted/50 shrink-0">
          <button
            type="button"
            onclick={() => { activeTab = 'pending'; selectedTx = null; }}
            class="flex-1 py-3 text-center text-xs font-bold transition-colors border-0 cursor-pointer border-b-2 {activeTab === 'pending' ? 'border-primary text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}"
          >
            À rapprocher ({pendingCount})
          </button>
          <button
            type="button"
            onclick={() => { activeTab = 'reconciled'; selectedTx = null; }}
            class="flex-1 py-3 text-center text-xs font-bold transition-colors border-0 cursor-pointer border-b-2 {activeTab === 'reconciled' ? 'border-primary text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}"
          >
            Rapprochées ({reconciledCount})
          </button>
          <button
            type="button"
            onclick={() => { activeTab = 'ignored'; selectedTx = null; }}
            class="flex-1 py-3 text-center text-xs font-bold transition-colors border-0 cursor-pointer border-b-2 {activeTab === 'ignored' ? 'border-primary text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}"
          >
            Ignorées ({ignoredCount})
          </button>
        </div>

        <div class="p-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
          <span class="font-bold text-xs text-muted-foreground">Liste des écritures ({displayedTransactions.length})</span>
          {#if activeTab === 'pending' && !isClosed}
            <button onclick={handleAnalyze} disabled={isAnalyzing} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-md shadow-sm cursor-pointer border-0">
              <Sparkles class="w-3.5 h-3.5" />
              {isAnalyzing ? 'Analyse IA...' : 'Lancer l\'analyse IA'}
            </button>
          {/if}
        </div>

        <div class="flex-1 overflow-y-auto divide-y divide-border">
          {#each displayedTransactions as bt}
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
                {#if bt.aiSuggestions && bt.status === 'pending'}
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
          {:else}
            <div class="p-8 text-center text-xs text-muted-foreground italic">
              Aucune transaction bancaire dans cet onglet.
            </div>
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

            {#if isClosed}
              <div class="p-4 bg-muted border border-border rounded-xl flex flex-col items-center justify-center text-center space-y-2 select-none">
                <ShieldAlert class="w-8 h-8 text-muted-foreground/60" />
                <h4 class="text-xs font-bold text-foreground">Saison Clôturée</h4>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Cette saison comptable est clôturée. Les écritures et les rapprochements bancaires ne peuvent plus être modifiés.
                </p>
              </div>
            {/if}

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
                      <div class="flex items-center gap-3">
                        <div class="font-bold text-emerald-600">{(Math.abs(gt.amount) / 100).toFixed(2)} €</div>
                        <button
                          type="button"
                          onclick={() => handleDeletePart(gt.id)}
                          class="text-destructive hover:bg-destructive/10 p-1.5 rounded border-0 cursor-pointer transition-colors"
                          title="Supprimer cette écriture liée"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
                {#if remainingAmount > 0}
                  <div class="text-xs font-bold text-right pt-2 border-t border-border text-foreground">
                    Reste à ventiler : {(remainingAmount / 100).toFixed(2)} €
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Si transaction déjà rapprochée complètement -->
            {#if selectedTx.status === 'reconciled'}
              <div class="p-3 bg-muted border border-border rounded-xl space-y-2">
                <h4 class="text-xs font-bold text-foreground">Rapprochement validé</h4>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Cette ligne bancaire est rapprochée. Pour modifier ou annuler l'imputation, cliquez sur la corbeille <Trash2 class="w-3 h-3 inline text-destructive" /> à côté des pièces ci-dessus. L'opération redeviendra active.
                </p>
              </div>
            {/if}

            <!-- Si transaction ignorée -->
            {#if selectedTx.status === 'ignored'}
              <div class="p-4 bg-muted border border-border rounded-xl space-y-3">
                <h4 class="text-xs font-bold text-foreground">Transaction ignorée</h4>
                <p class="text-xs text-muted-foreground">
                  Cette ligne a été écartée de la comptabilité. Vous pouvez la réactiver pour la rapprocher.
                </p>
                <button
                  onclick={() => handleUnignore(selectedTx!.id)}
                  class="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/95 cursor-pointer border-0 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <RefreshCw class="w-3.5 h-3.5" />
                  Réactiver cette transaction
                </button>
              </div>
            {/if}

            <!-- Étape 0 : Rapprochement & Suggestion IA (Seulement si rien n'a encore été ventilé, pending et non clôturé) -->
            {#if !isClosed && linkedGlTxs.length === 0 && selectedTx.status === 'pending'}
              <div class="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Sparkles class="w-4 h-4" />
                    <span>SUGGESTION IA DE RAPPROCHEMENT</span>
                  </div>
                  {#if selectedTx.aiSuggestions}
                    <button
                      onclick={() => handleAnalyzeSingle(selectedTx!.id)}
                      disabled={isAnalyzingSingle}
                      class="text-[10px] text-primary hover:underline bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1 font-semibold"
                      title="Recalculer la suggestion avec les dernières données"
                    >
                      <RefreshCw class="w-3.5 h-3.5 {isAnalyzingSingle ? 'animate-spin' : ''}" />
                      {isAnalyzingSingle ? 'Recalcul...' : 'Recalculer'}
                    </button>
                  {/if}
                </div>

                {#if selectedTx.aiSuggestions}
                  {@const sug = JSON.parse(selectedTx.aiSuggestions)}
                  {#if sug.memberId}
                    <p class="text-xs text-foreground leading-relaxed">
                      Associer cette ligne de relevé à l'adhérent **{sug.memberName}** dans la catégorie **{categories.find(c => c.id === sug.category)?.name || sug.category}**.
                    </p>
                  {:else}
                    <p class="text-xs text-foreground leading-relaxed">
                      Enregistrer cette transaction comme opération diverse de type **{categories.find(c => c.id === sug.category)?.name || sug.category}** (pas d'adhérent détecté).
                    </p>
                  {/if}
                  <button
                    onclick={() => handleMatchWithAI(selectedTx!.id, sug.memberId, sug.category)}
                    disabled={isSubmitting}
                    class="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 cursor-pointer border-0 shadow-sm font-medium"
                  >
                    Valider la suggestion IA
                  </button>
                {:else}
                  <p class="text-xs text-muted-foreground italic">
                    Aucune suggestion IA calculée pour cette opération.
                  </p>
                  <button
                    onclick={() => handleAnalyzeSingle(selectedTx!.id)}
                    disabled={isAnalyzingSingle}
                    class="w-full py-1.5 bg-primary/20 text-primary hover:bg-primary/30 text-xs font-semibold rounded-md cursor-pointer border-0 shadow-sm font-medium flex items-center justify-center gap-1.5"
                  >
                    <Sparkles class="w-3.5 h-3.5 {isAnalyzingSingle ? 'animate-spin' : ''}" />
                    {isAnalyzingSingle ? 'Analyse en cours...' : 'Demander une analyse IA'}
                  </button>
                {/if}
              </div>
            {/if}

            <!-- Étape 1 : Suggestions d'association (Seulement si rien n'a encore été ventilé, pending et non clôturé) -->
            {#if !isClosed && linkedGlTxs.length === 0 && selectedTx.status === 'pending'}
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

            <!-- Étape 2 : Création d'une nouvelle écriture (uniquement si reste à ventiler, pending et non clôturé) -->
            {#if !isClosed && remainingAmount > 0 && selectedTx.status === 'pending'}
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
                      autocomplete="off"
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
                      onkeydown={handleMemberKeyDown}
                    />
                    <span class="absolute right-2 top-6 text-muted-foreground pointer-events-none text-[8px]">▼</span>
                    
                    {#if isMemberDropdownOpen}
                      <div id="member-listbox" class="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded shadow-lg divide-y divide-border">
                        <button
                          type="button"
                          id="member-option-0"
                          class="w-full text-left px-2.5 py-1.5 text-xs transition-colors font-medium border-0 cursor-pointer italic {memberHighlightedIndex === 0 ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}"
                          onmousedown={() => {
                            selectedMemberId = '';
                            memberSearchQuery = '';
                          }}
                        >
                          -- Aucun adhérent (Opération diverse) --
                        </button>
                        {#each filteredMembers as m, index}
                          <button
                            type="button"
                            id={`member-option-${index + 1}`}
                            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors font-medium border-0 cursor-pointer {memberHighlightedIndex === index + 1 ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}"
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
                        autocomplete="off"
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
                        onkeydown={handleCategoryKeyDown}
                      />
                      <span class="absolute right-2 top-6 text-muted-foreground pointer-events-none text-[8px]">▼</span>
                      
                      {#if isCategoryDropdownOpen}
                        <div id="category-listbox" class="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded shadow-lg divide-y divide-border">
                          {#each filteredCategories as cat, index}
                            <button
                              type="button"
                              id={`category-option-${index}`}
                              class="w-full text-left px-2.5 py-1.5 text-xs transition-colors font-medium border-0 cursor-pointer {categoryHighlightedIndex === index ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}"
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

                  <!-- Moyen de paiement & Saison d'affectation -->
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                      <label for="method-select" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Moyen de paiement</label>
                      <select id="method-select" class="w-full px-2.5 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary text-foreground font-medium" bind:value={paymentMethod}>
                        <option value="virement">Virement</option>
                        <option value="cheque">Chèque</option>
                        <option value="especes">Espèces</option>
                      </select>
                    </div>

                    <div class="space-y-1">
                      <label for="season-select-reconcile" class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saison d'affectation</label>
                      <select id="season-select-reconcile" class="w-full px-2.5 py-1.5 border border-border bg-background rounded text-xs focus:ring-1 focus:ring-primary text-foreground font-medium" bind:value={targetSeasonId}>
                        {#each seasons as s}
                          <option value={s.id}>{s.name}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                </div>

                <button onclick={() => handleCreateAndMatch(selectedTx!)} class="w-full py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded text-xs font-semibold shadow-sm cursor-pointer border-0 mt-2 font-medium">
                  {linkedGlTxs.length > 0 ? 'Enregistrer cette partie' : "Créer & lier l'écriture"}
                </button>
              </div>
            {/if}
          </div>

          <!-- Boutons actions secondaires -->
          <div class="pt-4 border-t border-border flex justify-between gap-4">
            {#if !isClosed && selectedTx.status === 'pending'}
              <button onclick={() => handleIgnore(selectedTx!.id)} class="flex-1 py-2 border border-border bg-transparent text-destructive hover:bg-destructive/10 text-xs font-semibold rounded cursor-pointer font-medium">
                Ignorer cette écriture
              </button>
            {/if}
            <button onclick={() => selectedTx = null} class="px-4 py-2 border border-border bg-transparent hover:bg-muted text-xs font-semibold rounded cursor-pointer font-medium">
              Fermer
            </button>
          </div>
        {:else}
          <div class="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
            <ShieldAlert class="w-8 h-8 opacity-40 text-primary animate-pulse" />
            <p class="text-sm font-semibold text-foreground font-medium">Rapprochement intelligent</p>
            <p class="text-xs max-w-xs font-medium">
              Sélectionnez un onglet à gauche (À rapprocher, Rapprochées ou Ignorées) et cliquez sur une ligne pour gérer ses imputations.
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
