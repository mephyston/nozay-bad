export interface BankTransaction {
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

export interface GLTransaction {
  id: number;
  type: 'recette' | 'depense' | 'transfert';
  accountId: 'current' | 'savings' | 'cash';
  amount: number;
  date: string;
  description: string;
  category?: string | null;
  bankTransactionId?: number | null;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export interface Invoice {
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

export interface Member {
  id: number;
  licence: string;
  lastName: string;
  firstName: string;
  amountRemaining: number;
}

export interface ReconciliationStateProps {
  bankTransactions: BankTransaction[];
  glTransactions: GLTransaction[];
  seasonId: string;
  seasons: Season[];
  members: Member[];
  dbCategories?: any[];
}

export const accountLabels = {
  current: 'Compte Courant',
  savings: 'Compte Livret',
  cash: 'Caisse Physique'
};

export const fallbackCategories = [
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

export function createReconciliationState(initialProps: ReconciliationStateProps) {
  let bankTransactions = $state(initialProps.bankTransactions);
  let glTransactions = $state(initialProps.glTransactions);
  let seasonId = $state(initialProps.seasonId);
  let seasons = $state(initialProps.seasons);
  let members = $state(initialProps.members);
  let dbCategories = $state(initialProps.dbCategories || []);

  let selectedSeason = $state(initialProps.seasonId);
  let selectedTx = $state<BankTransaction | null>(null);
  let isSubmitting = $state(false);
  let isAnalyzing = $state(false);
  let isAnalyzingSingle = $state(false);
  let errorMsg = $state('');
  let showImportModal = $state(false);
  let selectedAccount = $state('auto');

  let activeTab = $state<'pending' | 'reconciled' | 'ignored'>('pending');
  let unpaidInvoices = $state<Invoice[]>([]);
  let activeRightTab = $state<'manual' | 'ledger' | 'invoice'>('manual');

  let category = $state('1');
  let paymentMethod = $state('virement');
  let selectedMemberId = $state<string>('');
  let amountToLink = $state<number>(0);
  let lastProcessedTxId = $state<number | null>(null);

  let selectedInvoiceIds = $state<Set<number>>(new Set());
  let isSplitMode = $state(false);
  let splits = $state<{ category: string; amount: number }[]>([]);

  let isMemberDropdownOpen = $state(false);
  let isCategoryDropdownOpen = $state(false);
  let memberSearchQuery = $state('');
  let categorySearchQuery = $state('');
  let targetSeasonId = $state(initialProps.seasonId);

  let selectedTxIds = $state<Record<number, boolean>>({});
  let searchQuery = $state('');

  let memberHighlightedIndex = $state(-1);
  let categoryHighlightedIndex = $state(-1);

  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);

  const categories = $derived(
    dbCategories && dbCategories.length > 0
      ? dbCategories.map(c => ({ id: String(c.id), name: c.adminLabel }))
      : fallbackCategories
  );

  const sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));

  function getSuggestions(bt: BankTransaction) {
    return glTransactions.filter(gt => {
      if (gt.bankTransactionId) return false;
      const matchesAmount = Math.abs(gt.amount) === Math.abs(bt.amount);
      if (!matchesAmount) return false;
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

  const suggestions = $derived(selectedTx ? getSuggestions(selectedTx) : []);

  const linkedGlTxs = $derived(selectedTx ? glTransactions.filter(gt => gt.bankTransactionId === selectedTx!.id) : []);
  const totalLinked = $derived(linkedGlTxs.reduce((sum, gt) => sum + Math.abs(gt.amount), 0));
  const remainingAmount = $derived(selectedTx ? Math.abs(selectedTx.amount) - totalLinked : 0);

  const pendingCount = $derived(bankTransactions.filter(t => t.status === 'pending').length);
  const reconciledCount = $derived(bankTransactions.filter(t => t.status === 'reconciled').length);
  const ignoredCount = $derived(bankTransactions.filter(t => t.status === 'ignored').length);

  const selectedCount = $derived(Object.keys(selectedTxIds).map(Number).filter(id => selectedTxIds[id]).length);

  const selectedSum = $derived(
    unpaidInvoices
      .filter(i => selectedInvoiceIds.has(i.id))
      .reduce((acc, i) => acc + i.totalAmount, 0)
  );

  const displayedTransactions = $derived(
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

  const memberDisplayVal = $derived.by(() => {
    if (!selectedMemberId) return '';
    const m = members.find(x => x.id.toString() === selectedMemberId);
    return m ? `${m.lastName} ${m.firstName}` : '';
  });

  const categoryDisplayVal = $derived.by(() => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.name : '';
  });

  const filteredMembers = $derived(
    memberSearchQuery.trim() === ''
      ? sortedMembers
      : sortedMembers.filter(m =>
          `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
        )
  );

  const filteredCategories = $derived(
    categorySearchQuery.trim() === ''
      ? categories
      : categories.filter(c => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
  );

  const matchingInvoices = $derived(
    selectedTx && selectedTx.amount > 0
      ? unpaidInvoices.filter(inv => inv.totalAmount === selectedTx.amount)
      : []
  );

  const otherUnpaidInvoices = $derived(
    selectedTx && selectedTx.amount > 0
      ? unpaidInvoices.filter(inv => inv.totalAmount !== selectedTx.amount)
      : unpaidInvoices
  );

  function toggleSelectAll(displayedTxs: BankTransaction[]) {
    const allSelected = displayedTxs.length > 0 && displayedTxs.every(t => selectedTxIds[t.id]);
    for (const t of displayedTxs) {
      selectedTxIds[t.id] = !allSelected;
    }
  }

  function toggleInvoiceSelection(id: number) {
    if (selectedInvoiceIds.has(id)) {
      selectedInvoiceIds.delete(id);
    } else {
      selectedInvoiceIds.add(id);
    }
    selectedInvoiceIds = new Set(selectedInvoiceIds);
  }

  function addSplitRow() {
    splits = [...splits, { category: '1', amount: 0 }];
  }

  function removeSplitRow(index: number) {
    if (splits.length > 2) {
      splits = splits.filter((_, i) => i !== index);
    }
  }

  function prepareNextFocus(currentBtId: number, isFullyReconciled: boolean) {
    if (typeof sessionStorage === 'undefined') return;
    if (!isFullyReconciled) {
      sessionStorage.setItem('reconcile_active_bt_id', currentBtId.toString());
    } else {
      const index = displayedTransactions.findIndex(t => t.id === currentBtId);
      if (index !== -1) {
        if (index + 1 < displayedTransactions.length) {
          sessionStorage.setItem('reconcile_active_bt_id', displayedTransactions[index + 1].id.toString());
        } else if (index - 1 >= 0) {
          sessionStorage.setItem('reconcile_active_bt_id', displayedTransactions[index - 1].id.toString());
        } else {
          sessionStorage.removeItem('reconcile_active_bt_id');
        }
      } else {
        sessionStorage.removeItem('reconcile_active_bt_id');
      }
    }
  }

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
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleBulkIgnore() {
    const ids = Object.keys(selectedTxIds).map(Number).filter(id => selectedTxIds[id]);
    if (ids.length === 0) return;
    if (typeof confirm !== 'undefined' && !confirm(`Voulez-vous ignorer ces ${ids.length} transactions bancaires ?`)) return;
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
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

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
            category: '1',
            amount: invoice.totalAmount,
            date: bt.date,
            paymentMethod: 'virement',
            description: `Facture ${invoice.invoiceNumber} - ${invoice.clientName}`,
            reference: bt.fitid
          }
        })
      });
      if (!res.ok) throw new Error('Erreur association facture.');
      if (typeof window !== 'undefined') window.location.reload();
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
            category: '1',
            amount: selectedTx.amount,
            date: selectedTx.date,
            paymentMethod: 'virement',
            description: `Rapprochement de ${ids.length} factures`,
            reference: selectedTx.fitid
          }
        })
      });
      if (!res.ok) throw new Error('Erreur association factures.');
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
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
      if (typeof window !== 'undefined') window.location.reload();
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
      if (typeof window !== 'undefined') window.location.reload();
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
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isAnalyzingSingle = false;
    }
  }

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
      if (typeof document === 'undefined') return;
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
      if (typeof document === 'undefined') return;
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
      if (typeof window !== 'undefined') window.location.reload();
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
        if (typeof window !== 'undefined') window.location.reload();
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
        if (typeof window !== 'undefined') window.location.reload();
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
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleDeletePart(txId: number) {
    if (typeof confirm !== 'undefined' && !confirm('Voulez-vous supprimer cette écriture liée ? Le solde de l\'adhérent et le rapprochement seront mis à jour.')) return;
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
      if (typeof window !== 'undefined') window.location.reload();
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
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  async function handleIgnore(btId: number) {
    if (typeof confirm !== 'undefined' && !confirm('Voulez-vous ignorer cette transaction bancaire ?')) return;
    isSubmitting = true;
    try {
      prepareNextFocus(btId, true);

      const res = await fetch('/admin/accounting/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ignore', btId })
      });
      if (!res.ok) throw new Error('Erreur ignore.');
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err: any) {
      alert(err.message);
      isSubmitting = false;
    }
  }

  function safeEffect(fn: () => void) {
    try {
      $effect(fn);
    } catch (e) {
      // Safe fallback when state factory is tested in non-component context
    }
  }

  safeEffect(() => {
    // Reset selection and search query when tab changes
    const _ = activeTab;
    selectedTxIds = {};
    searchQuery = '';
  });

  safeEffect(() => {
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

  safeEffect(() => {
    if (selectedSeason) {
      loadUnpaidInvoices();
    }
  });

  safeEffect(() => {
    if (!selectedTx && bankTransactions.length > 0 && typeof sessionStorage !== 'undefined') {
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

  safeEffect(() => {
    if (selectedTx && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('reconcile_active_bt_id', selectedTx.id.toString());
    }
  });

  safeEffect(() => {
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

  safeEffect(() => {
    if (!isMemberDropdownOpen) {
      memberHighlightedIndex = -1;
    }
  });

  safeEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    const savedScroll = sessionStorage.getItem('reconcile_list_scroll_top');
    if (savedScroll) {
      setTimeout(() => {
        if (typeof document === 'undefined') return;
        const container = document.querySelector('.reconcile-list-container');
        if (container) {
          container.scrollTop = parseInt(savedScroll);
        }
      }, 50);
    }
  });

  safeEffect(() => {
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

  safeEffect(() => {
    const total = filteredMembers.length + 1;
    if (memberHighlightedIndex >= total) {
      memberHighlightedIndex = total - 1;
    }
  });

  safeEffect(() => {
    if (!isCategoryDropdownOpen) {
      categoryHighlightedIndex = -1;
    }
  });

  safeEffect(() => {
    const total = filteredCategories.length;
    if (categoryHighlightedIndex >= total) {
      categoryHighlightedIndex = total - 1;
    }
  });

  return {
    get bankTransactions() { return bankTransactions; },
    set bankTransactions(v) { bankTransactions = v; },
    get glTransactions() { return glTransactions; },
    set glTransactions(v) { glTransactions = v; },
    get seasonId() { return seasonId; },
    set seasonId(v) { seasonId = v; },
    get seasons() { return seasons; },
    set seasons(v) { seasons = v; },
    get members() { return members; },
    set members(v) { members = v; },
    get dbCategories() { return dbCategories; },
    set dbCategories(v) { dbCategories = v; },
    get selectedSeason() { return selectedSeason; },
    set selectedSeason(v) { selectedSeason = v; },
    get selectedTx() { return selectedTx; },
    set selectedTx(v) { selectedTx = v; },
    get isSubmitting() { return isSubmitting; },
    set isSubmitting(v) { isSubmitting = v; },
    get isAnalyzing() { return isAnalyzing; },
    set isAnalyzing(v) { isAnalyzing = v; },
    get isAnalyzingSingle() { return isAnalyzingSingle; },
    set isAnalyzingSingle(v) { isAnalyzingSingle = v; },
    get errorMsg() { return errorMsg; },
    set errorMsg(v) { errorMsg = v; },
    get showImportModal() { return showImportModal; },
    set showImportModal(v) { showImportModal = v; },
    get selectedAccount() { return selectedAccount; },
    set selectedAccount(v) { selectedAccount = v; },
    get activeTab() { return activeTab; },
    set activeTab(v) { activeTab = v; },
    get unpaidInvoices() { return unpaidInvoices; },
    set unpaidInvoices(v) { unpaidInvoices = v; },
    get activeRightTab() { return activeRightTab; },
    set activeRightTab(v) { activeRightTab = v; },
    get category() { return category; },
    set category(v) { category = v; },
    get paymentMethod() { return paymentMethod; },
    set paymentMethod(v) { paymentMethod = v; },
    get selectedMemberId() { return selectedMemberId; },
    set selectedMemberId(v) { selectedMemberId = v; },
    get amountToLink() { return amountToLink; },
    set amountToLink(v) { amountToLink = v; },
    get lastProcessedTxId() { return lastProcessedTxId; },
    set lastProcessedTxId(v) { lastProcessedTxId = v; },
    get selectedInvoiceIds() { return selectedInvoiceIds; },
    set selectedInvoiceIds(v) { selectedInvoiceIds = v; },
    get isSplitMode() { return isSplitMode; },
    set isSplitMode(v) { isSplitMode = v; },
    get splits() { return splits; },
    set splits(v) { splits = v; },
    get isMemberDropdownOpen() { return isMemberDropdownOpen; },
    set isMemberDropdownOpen(v) { isMemberDropdownOpen = v; },
    get isCategoryDropdownOpen() { return isCategoryDropdownOpen; },
    set isCategoryDropdownOpen(v) { isCategoryDropdownOpen = v; },
    get memberSearchQuery() { return memberSearchQuery; },
    set memberSearchQuery(v) { memberSearchQuery = v; },
    get categorySearchQuery() { return categorySearchQuery; },
    set categorySearchQuery(v) { categorySearchQuery = v; },
    get targetSeasonId() { return targetSeasonId; },
    set targetSeasonId(v) { targetSeasonId = v; },
    get selectedTxIds() { return selectedTxIds; },
    set selectedTxIds(v) { selectedTxIds = v; },
    get searchQuery() { return searchQuery; },
    set searchQuery(v) { searchQuery = v; },
    get memberHighlightedIndex() { return memberHighlightedIndex; },
    set memberHighlightedIndex(v) { memberHighlightedIndex = v; },
    get categoryHighlightedIndex() { return categoryHighlightedIndex; },
    set categoryHighlightedIndex(v) { categoryHighlightedIndex = v; },
    get isClosed() { return isClosed; },
    get categories() { return categories; },
    get sortedMembers() { return sortedMembers; },
    get suggestions() { return suggestions; },
    get linkedGlTxs() { return linkedGlTxs; },
    get totalLinked() { return totalLinked; },
    get remainingAmount() { return remainingAmount; },
    get pendingCount() { return pendingCount; },
    get reconciledCount() { return reconciledCount; },
    get ignoredCount() { return ignoredCount; },
    get selectedCount() { return selectedCount; },
    get selectedSum() { return selectedSum; },
    get displayedTransactions() { return displayedTransactions; },
    get memberDisplayVal() { return memberDisplayVal; },
    get categoryDisplayVal() { return categoryDisplayVal; },
    get filteredMembers() { return filteredMembers; },
    get filteredCategories() { return filteredCategories; },
    get matchingInvoices() { return matchingInvoices; },
    get otherUnpaidInvoices() { return otherUnpaidInvoices; },
    toggleSelectAll,
    toggleInvoiceSelection,
    addSplitRow,
    removeSplitRow,
    prepareNextFocus,
    loadUnpaidInvoices,
    handleBulkReconcile,
    handleBulkIgnore,
    handleReconcile,
    handleMultiInvoiceReconcile,
    handleImport,
    handleAnalyze,
    handleAnalyzeSingle,
    selectMember,
    handleMemberKeyDown,
    selectCategory,
    handleCategoryKeyDown,
    handleMatch,
    handleCreateAndMatch,
    handleMatchWithAI,
    handleDeletePart,
    handleUnignore,
    handleIgnore,
    getSuggestions
  };
}

export type ReconciliationState = ReturnType<typeof createReconciliationState>;
