<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload, Check, AlertCircle, Trash2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-svelte';
  import { Button, Table, Input, Badge, Card, Dialog, Tabs, Checkbox } from '@metacult/shared-ui';
  import ReconciliationSummary from './ReconciliationSummary.svelte';
  import MatchTransaction from './MatchTransaction.svelte';
  import CreateTransactionFromBankLine from './CreateTransactionFromBankLine.svelte';

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

  interface Invoice {
    id: number;
    invoiceNumber: string;
    seasonId: string;
    date: string;
    dueDate: string;
    clientName: string;
    clientAddress: string | null;
    clientEmail: string | null;
    subject: string | null;
    location: string | null;
    period: string | null;
    attendees: string | null;
    status: 'draft' | 'sent' | 'paid' | 'cancelled';
    totalAmount: number;
    createdAt: string;
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
    members = [],
    dbCategories = []
  }: {
    bankTransactions: BankTransaction[];
    glTransactions: GLTransaction[];
    seasonId: string;
    seasons: Season[];
    members: Member[];
    dbCategories?: any[];
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

  let unpaidInvoices = $state<Invoice[]>([]);
  let activeRightTab = $state<'manual' | 'ledger' | 'invoice'>('manual');

  // Formulaire d'association/création
  let category = $state('1');
  let paymentMethod = $state('virement');
  let selectedMemberId = $state<string>('');
  let amountToLink = $state<number>(0);
  let lastProcessedTxId = $state<number | null>(null);

  // Task 3: Multi-match & manual split form state
  let selectedInvoiceIds = $state<Set<number>>(new Set());
  let selectedSum = $derived(
    unpaidInvoices
      .filter(i => selectedInvoiceIds.has(i.id))
      .reduce((acc, i) => acc + i.totalAmount, 0)
  );

  let isSplitMode = $state(false);
  let splits = $state<{ category: string; amount: number }[]>([]);

  function toggleInvoiceSelection(id: number) {
    if (selectedInvoiceIds.has(id)) {
      selectedInvoiceIds.delete(id);
    } else {
      selectedInvoiceIds.add(id);
    }
    selectedInvoiceIds = new Set(selectedInvoiceIds);
  }

  // États du dropdown personnalisé (Searchable Select / Combobox)
  let isMemberDropdownOpen = $state(false);
  let isCategoryDropdownOpen = $state(false);
  let memberSearchQuery = $state('');
  let categorySearchQuery = $state('');
  // svelte-ignore state_referenced_locally
  let targetSeasonId = $state(selectedSeason);

  const accountLabels = {
    current: 'Compte Courant',
    savings: 'Compte Livret',
    cash: 'Caisse Physique'
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

  const categories = $derived(
    dbCategories && dbCategories.length > 0
      ? dbCategories.map(c => ({ id: String(c.id), name: c.adminLabel }))
      : fallbackCategories
  );

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

  // --- MASSE & FILTRES INTELLIGENTS ---
  let selectedTxIds = $state<Record<number, boolean>>({});
  let selectedCount = $derived(Object.keys(selectedTxIds).map(Number).filter(id => selectedTxIds[id]).length);

  function toggleSelectAll(displayedTxs: BankTransaction[]) {
    const allSelected = displayedTxs.length > 0 && displayedTxs.every(t => selectedTxIds[t.id]);
    for (const t of displayedTxs) {
      selectedTxIds[t.id] = !allSelected;
    }
  }

  let searchQuery = $state('');

  $effect(() => {
    // Reset selection and search query when tab changes
    const _ = activeTab;
    selectedTxIds = {};
    searchQuery = '';
  });

  let displayedTransactions = $derived(
    bankTransactions.filter(t => {
      if (t.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (t.name || '').toLowerCase().includes(query);
        const matchesMemo = (t.memo || '').toLowerCase().includes(query);
        if (!matchesName && !matchesMemo) return false;
      }
      return true;
    })
  );

  async function handleBulkReconcile() {
    const ids = Object.keys(selectedTxIds).map(Number).filter(id => selectedTxIds[id]);
    if (ids.length === 0) return;
    isSubmitting = true;
    errorMsg = '';
    
    try {
      const requests = [];
      for (const id of ids) {
        const bt = bankTransactions.find(t => t.id === id);
        if (!bt || !bt.aiSuggestions) continue;

        let memberId = null;
        let category = '1';

        try {
          const sug = JSON.parse(bt.aiSuggestions);
          memberId = sug.memberId ? parseInt(sug.memberId) : null;
          category = sug.category || '1';
        } catch (e) {
          console.error('Failed to parse suggestions for transaction', bt.id, e);
        }

        requests.push({
          btId: bt.id,
          action: 'create',
          memberId,
          transaction: {
            seasonId: selectedSeason,
            type: bt.amount < 0 ? 'depense' : 'recette',
            accountId: bt.accountId,
            category,
            amount: Math.abs(bt.amount),
            date: bt.date,
            paymentMethod: 'virement',
            description: bt.name,
            reference: bt.fitid
          }
        });
      }

      if (requests.length === 0) {
        throw new Error('Aucune transaction sélectionnée ne dispose de suggestions valides.');
      }

      const res = await fetch('/admin/accounting/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk',
          requests
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors du rapprochement en masse.');
      }

      selectedTxIds = {};
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleBulkIgnore() {
    const ids = Object.keys(selectedTxIds).map(Number).filter(id => selectedTxIds[id]);
    if (ids.length === 0) return;
    if (!confirm(`Voulez-vous ignorer ces ${ids.length} transactions bancaires ?`)) return;
    isSubmitting = true;
    errorMsg = '';
    
    try {
      const promises = ids.map(btId =>
        fetch('/admin/accounting/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ignore', btId })
        })
      );
      
      const responses = await Promise.all(promises);
      const failed = responses.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error('Certaines transactions n\'ont pas pu être ignorées.');
      }
      
      selectedTxIds = {};
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }
  // ------------------------------------

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
      selectedInvoiceIds = new Set();
      isSplitMode = false;
      splits = [];
    }
  });

  async function loadUnpaidInvoices() {
    try {
      const res = await fetch('/admin/accounting/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-unpaid-invoices',
          season: selectedSeason
        })
      });
      if (res.ok) {
        const json = await res.json();
        unpaidInvoices = (json.data || []).filter((inv: Invoice) => inv.status === 'draft' || inv.status === 'sent');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des factures:', err);
    }
  }

  $effect(() => {
    if (selectedSeason) {
      loadUnpaidInvoices();
    }
  });

  async function handleReconcile(action: 'create', bt: BankTransaction, invoiceId: number) {
    isSubmitting = true;
    try {
      const invoice = unpaidInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error('Facture introuvable.');

      const isFullyReconciled = (remainingAmount - invoice.totalAmount) <= 10;
      prepareNextFocus(bt.id, isFullyReconciled);

      const res = await fetch('/admin/accounting/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          btId: bt.id,
          invoiceId: invoice.id,
          transaction: {
            seasonId: invoice.seasonId,
            type: 'recette',
            accountId: bt.accountId,
            category: '1', // default category
            amount: invoice.totalAmount,
            date: bt.date,
            paymentMethod: 'virement',
            description: `Facture ${invoice.invoiceNumber} - ${invoice.clientName}`,
            reference: bt.fitid
          }
        })
      });
      if (!res.ok) throw new Error('Erreur association facture.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleMultiInvoiceReconcile() {
    if (!selectedTx) return;
    isSubmitting = true;
    try {
      const ids = Array.from(selectedInvoiceIds);
      if (ids.length === 0) throw new Error('Aucune facture sélectionnée.');
      
      const firstInvoice = unpaidInvoices.find(inv => inv.id === ids[0]);
      if (!firstInvoice) throw new Error('Facture introuvable.');

      const isFullyReconciled = Math.abs(selectedSum - selectedTx.amount) <= 10;
      prepareNextFocus(selectedTx.id, isFullyReconciled);

      const res = await fetch('/admin/accounting/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          btId: selectedTx.id,
          invoiceIds: ids,
          transaction: {
            seasonId: firstInvoice.seasonId,
            type: 'recette',
            accountId: selectedTx.accountId,
            category: '1', // default category
            amount: selectedTx.amount,
            date: selectedTx.date,
            paymentMethod: 'virement',
            description: `Rapprochement de ${ids.length} factures`,
            reference: selectedTx.fitid
          }
        })
      });
      if (!res.ok) throw new Error('Erreur association factures.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  function addSplitRow() {
    splits = [...splits, { category: '1', amount: 0 }];
  }

  function removeSplitRow(index: number) {
    if (splits.length > 2) {
      splits = splits.filter((_, i) => i !== index);
    }
  }

  // Trouver les suggestions correspondantes du Grand Livre (même montant absolu et +/- 7 jours)
  function getSuggestions(bt: BankTransaction) {
    return glTransactions.filter(gt => {
      // Écarter les écritures déjà pointées/rapprochées
      if (gt.bankTransactionId) return false;

      const matchesAmount = Math.abs(gt.amount) === Math.abs(bt.amount);
      if (!matchesAmount) return false;

      // Un débit de banque (négatif) correspond à une dépense ou un transfert sortant
      // Un crédit de banque (positif) correspond à une recette ou un transfert entrant
      const isBankDebit = bt.amount < 0;
      const isGlExpense = gt.type === 'depense';
      const isGlReceipt = gt.type === 'recette';
      
      if (isBankDebit && isGlReceipt) return false;
      if (!isBankDebit && isGlExpense) return false;

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
      const res = await fetch('/admin/accounting/import', {
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
      const res = await fetch('/admin/accounting/import', {
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
      const res = await fetch('/admin/accounting/import', {
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
        }
      }
    }
  });

  $effect(() => {
    if (selectedTx) {
      sessionStorage.setItem('reconcile_active_bt_id', selectedTx.id.toString());
    }
  });

  $effect(() => {
    if (selectedTx && selectedTx.id !== lastProcessedTxId) {
      lastProcessedTxId = selectedTx.id;
      if (selectedTx.aiSuggestions) {
        try {
          const sug = JSON.parse(selectedTx.aiSuggestions);
          selectedMemberId = sug.memberId ? sug.memberId.toString() : '';
          if (sug.category) {
            category = sug.category.toString();
          }
        } catch (e) {
          selectedMemberId = '';
        }
      } else {
        selectedMemberId = '';
      }
    } else if (!selectedTx) {
      lastProcessedTxId = null;
      selectedMemberId = '';
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

  // Restaurer le défilement (scroll) de la liste au chargement
  $effect(() => {
    const savedScroll = sessionStorage.getItem('reconcile_list_scroll_top');
    if (savedScroll) {
      setTimeout(() => {
        const container = document.querySelector('.reconcile-list-container');
        if (container) {
          container.scrollTop = parseInt(savedScroll);
        }
      }, 50);
    }
  });

  // Faire défiler l'élément sélectionné dans le viewport si nécessaire
  $effect(() => {
    if (selectedTx) {
      setTimeout(() => {
        if (typeof document === 'undefined') return;
        const activeBtn = document.querySelector('.reconcile-list-container .border-l-primary');
        if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
          activeBtn.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }
      }, 100);
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

      const res = await fetch('/admin/accounting/import', {
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
      if (isSplitMode) {
        const splitSumCents = splits.reduce((acc, s) => acc + Math.round((s.amount || 0) * 100), 0);
        if (Math.abs(splitSumCents - remainingAmount) > 10) {
          throw new Error("Le montant total ventilé doit être égal au reste à rapprocher.");
        }

        const isFullyReconciled = (remainingAmount - splitSumCents) <= 10;
        prepareNextFocus(bt.id, isFullyReconciled);

        const res = await fetch('/admin/accounting/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            btId: bt.id,
            memberId: selectedMemberId ? parseInt(selectedMemberId) : null,
            transactions: splits.map((s, index) => ({
              seasonId: targetSeasonId,
              type: bt.amount < 0 ? 'depense' : 'recette',
              accountId: bt.accountId,
              category: s.category,
              amount: Math.round(s.amount * 100),
              date: bt.date,
              paymentMethod,
              description: `${bt.name} (Partie ${index + 1})`,
              reference: bt.fitid
            }))
          })
        });
        if (!res.ok) throw new Error('Erreur création.');
        window.location.reload();
      } else {
        const linkedAmount = Math.round(amountToLink * 100);
        const isFullyReconciled = (remainingAmount - linkedAmount) <= 10;
        prepareNextFocus(bt.id, isFullyReconciled);

        const res = await fetch('/admin/accounting/import', {
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
      }
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleMatchWithAI(btId: number, memberId: number | null, cat: string) {
    isSubmitting = true;
    try {
      prepareNextFocus(btId, true);

      const res = await fetch('/admin/accounting/import', {
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

      const res = await fetch('/admin/accounting/import', {
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

      const res = await fetch('/admin/accounting/import', {
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

      const res = await fetch('/admin/accounting/import', {
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
  let matchingInvoices = $derived(
    selectedTx && selectedTx.amount > 0
      ? unpaidInvoices.filter(inv => inv.totalAmount === selectedTx.amount)
      : []
  );

  let otherUnpaidInvoices = $derived(
    selectedTx && selectedTx.amount > 0
      ? unpaidInvoices.filter(inv => inv.totalAmount !== selectedTx.amount)
      : unpaidInvoices
  );

  onMount(() => {
    const handleOpen = () => {
      if (!isClosed) {
        showImportModal = true;
      }
    };
    window.addEventListener('open-bank-import', handleOpen);
    return () => {
      window.removeEventListener('open-bank-import', handleOpen);
    };
  });
</script>

<div class="space-y-6">

  <Dialog.Root bind:open={showImportModal}>
    <Dialog.Content class="max-w-md p-6 bg-card border-border shadow-xl">
      <Dialog.Header class="mb-4 border-b border-border pb-3">
        <Dialog.Title class="text-md font-bold flex items-center gap-2">
          <Upload class="w-4 h-4 text-primary" />
          Importer un relevé Société Générale
        </Dialog.Title>
        <Dialog.Description class="hidden">Importation de relevés bancaires OFX.</Dialog.Description>
      </Dialog.Header>

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
            <Input id="file-input-modal" type="file" accept=".ofx" class="w-full text-sm" required />
          </div>
        </div>

        <div class="pt-4 border-t border-border flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline"
            onclick={() => showImportModal = false} 
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            class="flex items-center gap-2"
          >
            <Upload class="w-3.5 h-3.5" />
            {isSubmitting ? 'Importation...' : 'Lancer l\'importation'}
          </Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Root>

  {#if bankTransactions.length === 0}
    <!-- Zone d'Importation initiale -->
    <Card.Root class="max-w-xl animate-in fade-in-50 duration-200 border-border bg-card p-8 shadow-sm">
      <Card.Header class="p-0 pb-4">
        <Card.Title class="text-lg font-bold flex items-center gap-2">
          <Upload class="w-5 h-5 text-primary" />
          Importer un relevé Société Générale
        </Card.Title>
      </Card.Header>
      <Card.Content class="p-0">
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
              <Input id="file-input" type="file" accept=".ofx" class="w-full text-sm mt-1.5" required />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting} class="w-full flex items-center justify-center gap-2">
            <Upload class="w-4 h-4" />
            {isSubmitting ? 'Importation en cours...' : 'Lancer l\'importation'}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Zone Rapprochement (Split-Screen) -->
    <div class="grid md:grid-cols-12 gap-6 h-[600px] animate-in fade-in-50 duration-200">
      <!-- Liste de gauche (7/12) -->
      <Card.Root class="md:col-span-7 flex flex-col h-full overflow-hidden border-border bg-card shadow-sm">
        <!-- Barre d'Onglets -->
        <Tabs.Root value={activeTab} onValueChange={(val) => { activeTab = val as any; selectedTx = null; sessionStorage.removeItem('reconcile_active_bt_id'); }} class="w-full shrink-0">
          <Tabs.List class="flex w-full rounded-none border-b border-border bg-muted/50 p-0">
            <Tabs.Trigger value="pending" class="flex-1 py-3 text-xs font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card bg-transparent">À rapprocher ({pendingCount})</Tabs.Trigger>
            <Tabs.Trigger value="reconciled" class="flex-1 py-3 text-xs font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card bg-transparent">Rapprochées ({reconciledCount})</Tabs.Trigger>
            <Tabs.Trigger value="ignored" class="flex-1 py-3 text-xs font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card bg-transparent">Ignorées ({ignoredCount})</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <div class="p-2 border-b border-border bg-muted/10 shrink-0">
          <Input
            type="text"
            placeholder="Rechercher une transaction (ex: salaire)..."
            bind:value={searchQuery}
            class="w-full"
          />
        </div>

        <div class="p-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
          <span class="font-bold text-xs text-muted-foreground">Liste des écritures ({displayedTransactions.length})</span>
          {#if activeTab === 'pending' && !isClosed}
            <Button onclick={handleAnalyze} disabled={isAnalyzing} class="inline-flex items-center gap-1.5 text-xs font-bold">
              <Sparkles class="w-3.5 h-3.5" />
              {isAnalyzing ? 'Analyse IA...' : 'Lancer l\'analyse IA'}
            </Button>
          {/if}
        </div>

        {#if selectedCount > 0}
          <div class="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10 animate-in slide-in-from-top duration-200">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-primary">Sélection ({selectedCount})</span>
              <Button
                variant="link"
                onclick={() => toggleSelectAll(displayedTransactions)}
                class="text-[10px] text-muted-foreground hover:text-foreground hover:underline p-0 h-auto font-semibold"
              >
                {displayedTransactions.length > 0 && displayedTransactions.every(t => selectedTxIds[t.id]) ? 'Tout décocher' : 'Sélectionner tout'}
              </Button>
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                onclick={handleBulkIgnore}
                disabled={isSubmitting}
                class="border-destructive/20 hover:bg-destructive/10 text-destructive text-[11px] font-bold h-7 px-2.5"
              >
                Ignorer en masse
              </Button>
              <Button
                onclick={handleBulkReconcile}
                disabled={isSubmitting}
                class="text-[11px] font-bold h-7 px-2.5 flex items-center gap-1"
              >
                <Check class="w-3.5 h-3.5" />
                Rapprocher en masse
              </Button>
            </div>
          </div>
        {/if}

        <div 
          class="flex-1 overflow-y-auto divide-y divide-border reconcile-list-container"
          onscroll={(e) => {
            sessionStorage.setItem('reconcile_list_scroll_top', (e.currentTarget as HTMLDivElement).scrollTop.toString());
          }}
        >
          {#each displayedTransactions as bt}
            <Button
              variant="ghost"
              onclick={() => { selectedTx = bt; selectedMemberId = ''; }}
              class="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4 border-0 cursor-pointer h-auto rounded-none justify-between {selectedTx?.id === bt.id ? 'bg-muted border-l-4 border-l-primary' : ''}"
              title="{bt.name}{bt.memo ? ' — ' + bt.memo : ''}"
            >
              <div class="flex items-start gap-3 flex-1 min-w-0">
                {#if activeTab === 'pending' && !isClosed}
                  <Checkbox
                    checked={!!selectedTxIds[bt.id]}
                    onCheckedChange={(val) => {
                      selectedTxIds[bt.id] = !!val;
                    }}
                    onclick={(e) => e.stopPropagation()}
                    class="w-4 h-4 shrink-0 mt-0.5"
                  />
                {/if}
                <div class="flex-1 min-w-0 text-left">
                  <div class="font-bold text-sm text-foreground truncate max-w-[280px]" title={bt.name}>{bt.name}</div>
                  <div class="text-xs text-muted-foreground">{bt.date} • {accountLabels[bt.accountId]}</div>
                  {#if bt.memo}
                    <div class="text-xs text-muted-foreground italic truncate max-w-[280px]" title={bt.memo}>{bt.memo}</div>
                  {/if}
                  {#if bt.aiSuggestions && bt.status === 'pending'}
                    {@const sug = JSON.parse(bt.aiSuggestions)}
                    {#if sug.memberName}
                      <Badge variant="outline" class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border-primary/20 text-[10px] font-semibold text-primary">
                        <Sparkles class="w-2.5 h-2.5" />
                        IA : {sug.memberName} ({categories.find(c => c.id === String(sug.category))?.name || sug.category})
                      </Badge>
                    {:else}
                      <Badge variant="outline" class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border-border text-[10px] font-semibold text-muted-foreground">
                        <Sparkles class="w-2.5 h-2.5" />
                        IA : Opération diverse ({categories.find(c => c.id === String(sug.category))?.name || sug.category})
                      </Badge>
                    {/if}
                  {/if}
                </div>
              </div>
              <div class="font-bold text-sm shrink-0 {bt.amount < 0 ? 'text-destructive' : 'text-emerald-600'}">
                {bt.amount < 0 ? '' : '+'}{(bt.amount / 100).toFixed(2)} €
              </div>
            </Button>
          {:else}
            <div class="p-8 text-center text-xs text-muted-foreground italic">
              Aucune transaction bancaire dans cet onglet.
            </div>
          {/each}
        </div>
      </Card.Root>

      <!-- Panneau Action de droite (5/12) -->
      <Card.Root class="md:col-span-5 border-border bg-card p-6 h-full flex flex-col justify-between overflow-y-auto shadow-sm animate-in fade-in-50 duration-200">
        {#if selectedTx}
          <div class="space-y-5">
            <div>
              <h3 class="font-bold text-lg" title={selectedTx.name}>{selectedTx.name}</h3>
              <p class="text-xs text-muted-foreground mt-1">Ligne bancaire sélectionnée • ID: {selectedTx.fitid}</p>
              {#if selectedTx.memo}
                <div class="text-xs text-foreground bg-muted/40 p-3 rounded-lg border border-border mt-3 whitespace-pre-wrap leading-relaxed break-words" title={selectedTx.memo}>
                  <span class="font-bold text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Détails / Mémo bancaire</span>
                  {selectedTx.memo}
                </div>
              {/if}
              <div class="text-2xl font-bold mt-3 {selectedTx.amount < 0 ? 'text-destructive' : 'text-emerald-600'}">
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
            <ReconciliationSummary
              {selectedTx}
              {linkedGlTxs}
              {totalLinked}
              {remainingAmount}
              onDeleteGlLink={handleDeletePart}
            />

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
                <Button
                  onclick={() => handleUnignore(selectedTx!.id)}
                  class="w-full flex items-center justify-center gap-1.5"
                >
                  <RefreshCw class="w-3.5 h-3.5" />
                  Réactiver cette transaction
                </Button>
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
                    <Button
                      variant="ghost"
                      size="xs"
                      onclick={() => handleAnalyzeSingle(selectedTx!.id)}
                      disabled={isAnalyzingSingle}
                      class="text-[10px] text-primary hover:underline p-0 h-auto font-semibold flex items-center gap-1"
                      title="Recalculer la suggestion avec les dernières données"
                    >
                      <RefreshCw class="w-3.5 h-3.5 {isAnalyzingSingle ? 'animate-spin' : ''}" />
                      {isAnalyzingSingle ? 'Recalcul...' : 'Recalculer'}
                    </Button>
                  {/if}
                </div>

                {#if selectedTx.aiSuggestions}
                  {@const sug = JSON.parse(selectedTx.aiSuggestions)}
                  {#if sug.memberId}
                    <p class="text-xs text-foreground leading-relaxed">
                      Associer cette ligne de relevé à l'adhérent **{sug.memberName}** dans la catégorie **{categories.find(c => c.id === String(sug.category))?.name || sug.category}**.
                    </p>
                  {:else}
                    <p class="text-xs text-foreground leading-relaxed">
                      Enregistrer cette transaction comme opération diverse de type **{categories.find(c => c.id === String(sug.category))?.name || sug.category}** (pas d'adhérent détecté).
                    </p>
                  {/if}
                  <Button
                    onclick={() => handleMatchWithAI(selectedTx!.id, sug.memberId, sug.category)}
                    disabled={isSubmitting}
                    class="w-full font-medium"
                  >
                    Valider la suggestion IA
                  </Button>
                {:else}
                  <p class="text-xs text-muted-foreground italic">
                    Aucune suggestion IA calculée pour cette opération.
                  </p>
                  <Button
                    onclick={() => handleAnalyzeSingle(selectedTx!.id)}
                    disabled={isAnalyzingSingle}
                    class="w-full font-medium flex items-center justify-center gap-1.5"
                  >
                    <Sparkles class="w-3.5 h-3.5 {isAnalyzingSingle ? 'animate-spin' : ''}" />
                    {isAnalyzingSingle ? 'Analyse en cours...' : 'Demander une analyse IA'}
                  </Button>
                {/if}
              </div>
            {/if}

            <!-- Onglets de rapprochement -->
            {#if !isClosed && selectedTx.status === 'pending'}
              <Tabs.Root value={activeRightTab} onValueChange={(val) => activeRightTab = val as any} class="w-full shrink-0">
                <Tabs.List class="flex w-full rounded-lg bg-muted/30 p-0.5">
                  <Tabs.Trigger value="manual" class="flex-1 py-1.5 text-xs font-semibold rounded-md">Saisir écriture</Tabs.Trigger>
                  <Tabs.Trigger value="ledger" class="flex-1 py-1.5 text-xs font-semibold rounded-md">Suggestions</Tabs.Trigger>
                  <Tabs.Trigger value="invoice" class="flex-1 py-1.5 text-xs font-semibold rounded-md">Associer Facture</Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>
            {/if}

            <!-- Étape 1 : Suggestions d'association (Seulement si rien n'a encore été ventilé, pending et non clôturé, et onglet suggestions actif) -->
            {#if !isClosed && linkedGlTxs.length === 0 && selectedTx.status === 'pending' && activeRightTab === 'ledger'}
              <div class="border border-border rounded-xl p-4 space-y-3 bg-muted/40">
                <MatchTransaction
                  {glTransactions}
                  {selectedTx}
                  {remainingAmount}
                  bind:selectedMemberId
                  {isSubmitting}
                  onMatch={(gtId) => handleMatch(selectedTx.id, gtId)}
                  suggestions={[]}
                  onSelectAiSuggestion={() => {}}
                  {sortedMembers}
                  bind:isMemberDropdownOpen
                  bind:memberSearchQuery
                />
              </div>
            {:else}
              {#if activeRightTab === 'ledger'}
                <div class="border border-border rounded-xl p-4 bg-muted/40">
                  <p class="text-xs text-muted-foreground italic">Les suggestions du Grand Livre ne sont pas disponibles (opération déjà ventilée ou clôturée).</p>
                </div>
              {/if}
            {/if}

            <!-- Étape 2 : Création d'une nouvelle écriture (uniquement si reste à ventiler, pending, non clôturé et onglet manuel actif) -->
            {#if !isClosed && remainingAmount > 0 && selectedTx.status === 'pending' && activeRightTab === 'manual'}
              <div class="border border-border rounded-xl p-4 space-y-3">
                <CreateTransactionFromBankLine
                  {selectedTx}
                  {remainingAmount}
                  bind:category
                  bind:paymentMethod
                  bind:selectedMemberId
                  {isSubmitting}
                  onCreate={() => handleCreateAndMatch(selectedTx)}
                  bind:isSplitMode
                  bind:splits
                  onAddSplit={addSplitRow}
                  onRemoveSplit={removeSplitRow}
                  {categories}
                  {sortedMembers}
                  bind:isMemberDropdownOpen
                  bind:isCategoryDropdownOpen
                  bind:memberSearchQuery
                  bind:categorySearchQuery
                />
              </div>
            {/if}

            <!-- Étape 3 : Associer à une facture (uniquement si reste à ventiler, pending, non clôturé et onglet facture actif) -->
            {#if !isClosed && selectedTx.status === 'pending' && activeRightTab === 'invoice'}
              {#if selectedTx.amount < 0}
                <div class="p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                  Le rapprochement de facture est réservé aux recettes (crédits). Cette transaction est un débit.
                </div>
              {:else}
                <div class="space-y-4">
                  <!-- Panier Commande / Récapitulatif de sélection -->
                  <div class="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                    <div class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Panier Commande</div>
                    <div class="space-y-1.5">
                      <div class="flex justify-between items-center text-xs font-medium">
                        <span class="text-muted-foreground">Factures sélectionnées :</span>
                        <span class="font-semibold text-foreground">{selectedInvoiceIds.size}</span>
                      </div>
                      <div class="flex justify-between items-center text-xs font-medium">
                        <span class="text-muted-foreground">Total sélectionné :</span>
                        <span class="font-semibold text-foreground">{(selectedSum / 100).toFixed(2)} €</span>
                      </div>
                      <div class="flex justify-between items-center text-xs font-medium">
                        <span class="text-muted-foreground">Montant de la transaction :</span>
                        <span class="font-semibold text-foreground">{(selectedTx.amount / 100).toFixed(2)} €</span>
                      </div>
                      <div class="flex justify-between items-center text-xs font-medium pt-1 border-t border-border">
                        <span class="text-muted-foreground">Écart :</span>
                        <span class="font-bold {Math.abs(selectedSum - selectedTx.amount) <= 10 ? 'text-emerald-600' : 'text-destructive'}">
                          {(Math.abs(selectedSum - selectedTx.amount) / 100).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                    <Button
                      id="btn-valider-association"
                      disabled={isSubmitting || Math.abs(selectedSum - selectedTx.amount) > 10}
                      onclick={handleMultiInvoiceReconcile}
                      class="w-full font-medium"
                    >
                      Valider l'association
                    </Button>
                  </div>

                  <!-- Suggestions de factures correspondantes -->
                  {#if matchingInvoices.length > 0}
                    <div class="border border-emerald-600/30 bg-emerald-600/5 rounded-xl p-4 space-y-3">
                      <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider">
                        <Sparkles class="w-4 h-4" />
                        <span>Suggestion de Facture</span>
                      </div>
                      <div class="space-y-2">
                        {#each matchingInvoices as inv}
                          <div class="flex items-center justify-between gap-2 p-2.5 bg-background border border-border rounded-md text-xs">
                            <div class="flex items-center gap-2">
                              <Checkbox
                                class="invoice-checkbox w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer animate-none"
                                checked={selectedInvoiceIds.has(inv.id)}
                                onCheckedChange={() => toggleInvoiceSelection(inv.id)}
                              />
                              <div>
                                <div class="font-bold text-foreground">{inv.clientName}</div>
                                <div class="text-[10px] text-muted-foreground">N° {inv.invoiceNumber} • Échéance : {inv.dueDate}</div>
                                <div class="text-[10px] text-muted-foreground italic truncate max-w-[200px]">{inv.subject || ''}</div>
                              </div>
                            </div>
                            <div class="flex flex-col items-end gap-1.5 shrink-0">
                              <div class="font-bold text-emerald-600">{(inv.totalAmount / 100).toFixed(2)} €</div>
                              <Button 
                                onclick={() => handleReconcile('create', selectedTx!, inv.id)} 
                                class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                size="sm"
                              >
                                Associer
                              </Button>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Liste complète des factures impayées -->
                  <div class="border border-border rounded-xl p-4 space-y-3">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {matchingInvoices.length > 0 ? 'Autres factures ouvertes' : 'Factures impayées ouvertes'}
                    </h4>
                    <div class="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {#each otherUnpaidInvoices as inv}
                        <div class="flex items-center justify-between gap-2 p-2.5 bg-background border border-border rounded-md text-xs hover:bg-muted/30 transition-colors">
                          <div class="flex items-center gap-2">
                            <Checkbox
                              class="invoice-checkbox w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer animate-none"
                              checked={selectedInvoiceIds.has(inv.id)}
                              onCheckedChange={() => toggleInvoiceSelection(inv.id)}
                            />
                            <div>
                              <div class="font-semibold text-foreground">{inv.clientName}</div>
                              <div class="text-[10px] text-muted-foreground">N° {inv.invoiceNumber} • Échéance : {inv.dueDate}</div>
                              <div class="text-[10px] text-muted-foreground italic truncate max-w-[180px]">{inv.subject || ''}</div>
                            </div>
                          </div>
                          <div class="flex flex-col items-end gap-1.5 shrink-0">
                            <div class="font-bold text-foreground">{(inv.totalAmount / 100).toFixed(2)} €</div>
                            <Button 
                              onclick={() => handleReconcile('create', selectedTx!, inv.id)} 
                              size="sm"
                            >
                              Associer
                            </Button>
                          </div>
                        </div>
                      {:else}
                        {#if matchingInvoices.length === 0}
                          <p class="text-xs text-muted-foreground italic">Aucune facture impayée trouvée pour cette saison.</p>
                        {/if}
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            {/if}
          </div>

          <!-- Boutons actions secondaires -->
          <div class="pt-4 border-t border-border flex justify-between gap-4">
            {#if !isClosed && selectedTx.status === 'pending'}
              <Button variant="outline" onclick={() => handleIgnore(selectedTx!.id)} class="flex-1 text-destructive hover:bg-destructive/10 font-medium">
                Ignorer cette écriture
              </Button>
            {/if}
            <Button variant="outline" onclick={() => { selectedTx = null; sessionStorage.removeItem('reconcile_active_bt_id'); }} class="font-medium">
              Fermer
            </Button>
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
      </Card.Root>
    </div>
  {/if}
</div>
