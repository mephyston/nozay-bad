<script lang="ts">
  import { Wallet, FileText, CheckCircle, Trash2, Camera, UploadCloud, Search, ArrowRight, Loader2, Link, MoreVertical, Eye } from 'lucide-svelte';
  import { Button, Table, Input, Badge, Card, Dialog, Alert } from '@metacult/shared-ui';

  interface Check {
    id: number;
    checkDepositId: number | null;
    seasonId: string;
    number: string;
    amount: number;
    emitter: string;
    bank: string | null;
    memberId: number | null;
    transactionId: number | null;
    status: 'received' | 'deposited';
    photoUrl: string | null;
    createdAt: string;
    memberName: string | null;
    memberLicence: string | null;
  }

  interface CheckDeposit {
    id: number;
    seasonId: string;
    reference: string;
    date: string;
    amount: number;
    status: 'pending' | 'deposited' | 'cleared';
    bankTransactionId: number | null;
    createdAt: string;
  }

  interface Member {
    id: number;
    licence: string;
    lastName: string;
    firstName: string;
    parent1Name: string | null;
    parent2Name: string | null;
  }

  interface BankTransaction {
    id: number;
    fitid: string;
    amount: number;
    date: string;
    name: string;
    memo: string | null;
    status: string;
  }

  interface Props {
    seasonId: string;
    seasons: { id: string; name: string; active: boolean; closed?: boolean }[];
    checks: Check[];
    checkDeposits: CheckDeposit[];
    members: Member[];
    pendingBankTransactions: BankTransaction[];
  }

  let { seasonId, seasons, checks, checkDeposits, members, pendingBankTransactions }: Props = $props();

  // Active Tab
  let activeTab = $state<'checks' | 'deposits'>('checks');

  // Selected Season
  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);

  // View / Print deposit slip states
  let showViewDepositModal = $state(false);
  let selectedDepositToView = $state<CheckDeposit | null>(null);
  const checksInViewDeposit = $derived(selectedDepositToView ? checks.filter(c => c.checkDepositId === selectedDepositToView.id) : []);

  let openDropdownId = $state<string | number | null>(null);

  function toggleDropdown(id: string | number, e: MouseEvent) {
    e.stopPropagation();
    openDropdownId = openDropdownId === id ? null : id;
  }

  $effect(() => {
    const handleGlobalClick = () => { openDropdownId = null; };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });

  // Add Check Form State
  let showAddCheckModal = $state(false);
  let isAnalyzing = $state(false);
  let isSubmittingCheck = $state(false);
  let checkNumber = $state('');
  let checkAmount = $state('');
  let checkEmitter = $state('');
  let checkBank = $state('');
  let checkMemberId = $state<string>('');
  let checkCategory = $state('1');
  let checkDate = $state(new Date().toISOString().split('T')[0]);
  let formError = $state('');

  // Search filter for checks & members in select
  let checkSearchQuery = $state('');
  let memberSearchQuery = $state('');
  let matchedMemberName = $state('');

  // Combobox states
  let isMemberDropdownOpen = $state(false);
  let isCategoryDropdownOpen = $state(false);
  let categorySearchQuery = $state('');
  
  // List of categories
  const categoriesList = [
    { id: '1', name: 'Cotisation / Adhésion' },
    { id: '6', name: 'Recette Buvette' },
    { id: '7', name: 'Vente Cordage' },
    { id: '14', name: 'Divers / Recettes annexes' }
  ];

  // Derived display values
  const memberDisplayVal = $derived.by(() => {
    if (!checkMemberId) return '';
    const m = members.find(item => item.id === parseInt(checkMemberId));
    return m ? `${m.lastName} ${m.firstName} (${m.licence})` : '';
  });

  const categoryDisplayVal = $derived.by(() => {
    const cat = categoriesList.find(c => c.id === checkCategory);
    return cat ? cat.name : '';
  });

  // Filtered categories
  const filteredCategories = $derived.by(() => {
    if (!categorySearchQuery.trim()) return categoriesList;
    const q = categorySearchQuery.toLowerCase();
    return categoriesList.filter(c => c.name.toLowerCase().includes(q));
  });

  // Option list that guarantees the currently selected member is present
  const memberOptions = $derived.by(() => {
    let list = [...filteredMembers];
    if (checkMemberId) {
      const selectedId = parseInt(checkMemberId);
      const isAlreadyInList = list.some(m => m.id === selectedId);
      if (!isAlreadyInList) {
        const found = members.find(m => m.id === selectedId);
        if (found) {
          list = [found, ...list];
        }
      }
    }
    return list;
  });

  // Selected checks for deposit
  let selectedCheckIds = $state<Record<number, boolean>>({});
  
  // Deposit Slip creation form
  let showCreateDepositModal = $state(false);
  let depositReference = $state('');
  let depositDate = $state(new Date().toISOString().split('T')[0]);
  let isSubmittingDeposit = $state(false);

  // Clearing / Reconciliation modal
  let showClearModal = $state(false);
  let selectedDepositToClear = $state<CheckDeposit | null>(null);
  let selectedBankTransactionId = $state<string>('');
  let isSubmittingClear = $state(false);

  // Auto-generate reference for deposit
  $effect(() => {
    if (showCreateDepositModal) {
      const count = checkDeposits.length + 1;
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      depositReference = `REMISE-${today}-${count}`;
    }
  });

  // Filter members based on search
  const filteredMembers = $derived.by(() => {
    if (!memberSearchQuery) return members.slice(0, 10);
    const q = memberSearchQuery.toLowerCase();
    return members.filter(m => 
      m.firstName.toLowerCase().includes(q) || 
      m.lastName.toLowerCase().includes(q) || 
      m.licence.includes(q) ||
      (m.parent1Name && m.parent1Name.toLowerCase().includes(q)) ||
      (m.parent2Name && m.parent2Name.toLowerCase().includes(q))
    ).slice(0, 15);
  });

  // Selected checks count and sum
  const selectedChecksList = $derived.by(() => {
    return checks.filter(c => c.status === 'received' && selectedCheckIds[c.id]);
  });

  const totalSelectedAmount = $derived.by(() => {
    return selectedChecksList.reduce((sum, c) => sum + c.amount, 0);
  });

  // Photo Input capture
  let fileInput = $state<HTMLInputElement>();

  async function handlePhotoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    isAnalyzing = true;
    formError = '';

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Direct call to API analyze endpoint via the same Astro page proxy
      const res = await fetch(`?season=${selectedSeason}`, {
        method: 'POST',
        headers: {
          // Send special action header so page proxy knows to forward to analyze
          'x-action': 'analyze'
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to analyze check');
      }

      const json = await res.json();
      if (json.success && json.data) {
        checkNumber = json.data.number || '';
        checkAmount = json.data.amount ? json.data.amount.toString() : '';
        checkEmitter = json.data.emitter || '';
        checkBank = json.data.bank || '';
        checkMemberId = json.data.memberId ? json.data.memberId.toString() : '';
        matchedMemberName = json.data.memberName || '';
        if (json.data.date) {
          checkDate = json.data.date;
        }
      } else {
        throw new Error(json.error || 'Erreur lors de la lecture des données.');
      }
    } catch (err: any) {
      console.error(err);
      formError = "L'analyse IA a échoué (" + (err.message || 'erreur de connexion') + "). Vous pouvez saisir les informations manuellement.";
    } finally {
      isAnalyzing = false;
    }
  }

  async function handleAddCheck(e: SubmitEvent) {
    e.preventDefault();
    if (!checkNumber || !checkAmount || !checkEmitter) {
      formError = 'Veuillez renseigner le numéro, le montant et l\'émetteur.';
      return;
    }

    isSubmittingCheck = true;
    formError = '';

    try {
      const res = await fetch(`?season=${selectedSeason}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-check',
          seasonId: selectedSeason,
          number: checkNumber,
          amount: Math.round(parseFloat(checkAmount) * 100), // convert to centimes
          emitter: checkEmitter,
          bank: checkBank || null,
          memberId: checkMemberId ? parseInt(checkMemberId) : null,
          category: checkCategory,
          date: checkDate
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // Reset form and reload
      showAddCheckModal = false;
      checkNumber = '';
      checkAmount = '';
      checkEmitter = '';
      checkBank = '';
      checkMemberId = '';
      checkDate = new Date().toISOString().split('T')[0];
      matchedMemberName = '';
      categorySearchQuery = '';
      window.location.reload();
    } catch (err: any) {
      formError = err.message || 'Erreur lors de l\'enregistrement du chèque.';
    } finally {
      isSubmittingCheck = false;
    }
  }

  async function handleDeleteCheck(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce chèque ? Cette action annulera le règlement associé dans le Grand Livre.')) return;

    try {
      const res = await fetch(`?season=${selectedSeason}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-check',
          id
        })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert('Erreur lors de la suppression.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateDeposit(e: SubmitEvent) {
    e.preventDefault();
    const checkIds = selectedChecksList.map(c => c.id);
    if (checkIds.length === 0) return;

    isSubmittingDeposit = true;
    try {
      const res = await fetch(`?season=${selectedSeason}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-deposit',
          seasonId: selectedSeason,
          reference: depositReference,
          date: depositDate,
          checkIds
        })
      });

      if (res.ok) {
        showCreateDepositModal = false;
        selectedCheckIds = {};
        window.location.reload();
      } else {
        alert('Erreur lors de la création du bordereau.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSubmittingDeposit = false;
    }
  }

  async function handleDeleteDeposit(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bordereau ? Les chèques associés repasseront au statut "Reçus" et le rapprochement bancaire sera annulé.')) return;

    try {
      const res = await fetch(`?season=${selectedSeason}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-deposit',
          id
        })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert('Erreur lors de la suppression.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleClearDeposit(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedDepositToClear || !selectedBankTransactionId) return;

    isSubmittingClear = true;
    try {
      const res = await fetch(`?season=${selectedSeason}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear-deposit',
          id: selectedDepositToClear.id,
          bankTransactionId: parseInt(selectedBankTransactionId)
        })
      });

      if (res.ok) {
        showClearModal = false;
        selectedDepositToClear = null;
        selectedBankTransactionId = '';
        window.location.reload();
      } else {
        alert('Erreur lors du rapprochement.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSubmittingClear = false;
    }
  }

  // Filter checks table
  const filteredChecks = $derived.by(() => {
    if (!checkSearchQuery) return checks.filter(c => c.status === 'received');
    const q = checkSearchQuery.toLowerCase();
    return checks.filter(c => 
      c.status === 'received' && (
        c.number.includes(q) ||
        c.emitter.toLowerCase().includes(q) ||
        (c.bank && c.bank.toLowerCase().includes(q)) ||
        (c.memberName && c.memberName.toLowerCase().includes(q))
      )
    );
  });
</script>

<div class="space-y-6">
  <!-- Top Panel -->
  <Card.Root>
    <Card.Content class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Remise de Chèques
          </h1>
          <p class="text-sm text-muted-foreground">
            Gestion et suivi des chèques physiques, génération de bordereaux de remise et rapprochement bancaire.
          </p>
        </div>
        {#if isClosed}
          <Badge variant="outline" class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground self-start mt-1">
            Saison clôturée (Lecture seule)
          </Badge>
        {/if}
      </div>

      <!-- Season Selector -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground whitespace-nowrap">Saison&nbsp;:</span>
        <select
          bind:value={selectedSeason}
          onchange={() => window.location.href = `?season=${selectedSeason}`}
          class="bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        >
          {#each seasons as s}
            <option value={s.id}>{s.name}</option>
          {/each}
        </select>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Main Tabs Navigation -->
  <div class="border-b border-border flex items-center justify-between">
    <div class="flex gap-4">
      <Button
        variant="ghost"
        onclick={() => activeTab = 'checks'}
        class="px-4 py-2 text-sm font-semibold border-b-2 rounded-none transition-all outline-none -mb-px {activeTab === 'checks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        Chèques reçus ({checks.filter(c => c.status === 'received').length})
      </Button>
      <Button
        variant="ghost"
        onclick={() => activeTab = 'deposits'}
        class="px-4 py-2 text-sm font-semibold border-b-2 rounded-none transition-all outline-none -mb-px {activeTab === 'deposits' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        Bordereaux de Remise ({checkDeposits.length})
      </Button>
    </div>

    {#if activeTab === 'checks' && !isClosed}
      <div class="flex gap-2 mb-2">
        <Button
          onclick={() => showAddCheckModal = true}
          class="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
        >
          <Camera class="h-4 w-4" />
          Enregistrer un Chèque
        </Button>

        {#if selectedChecksList.length > 0}
          <Button
            onclick={() => showCreateDepositModal = true}
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm animate-pulse"
          >
            <FileText class="h-4 w-4" />
            Remise de {selectedChecksList.length} chèque(s) ({(totalSelectedAmount / 100).toFixed(2)} €)
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Tab Contents -->
  {#if activeTab === 'checks'}
    <!-- Checks List -->
    <Card.Root class="overflow-hidden shadow-sm">
      <Card.Content class="p-0">
        <div class="p-4 border-b border-border flex items-center gap-3">
          <Search class="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par numéro, émetteur, banque, adhérent..."
            bind:value={checkSearchQuery}
            class="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none focus-visible:ring-transparent h-auto p-0 placeholder:text-muted-foreground text-foreground"
          />
        </div>

        <div class="overflow-x-auto min-h-[180px]">
          <Table.Root class="w-full text-left border-collapse text-sm">
            <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
              <Table.Row>
                <Table.Head class="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredChecks.length > 0 && filteredChecks.every(c => selectedCheckIds[c.id])}
                    onchange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      filteredChecks.forEach(c => selectedCheckIds[c.id] = checked);
                    }}
                    disabled={isClosed}
                    class="rounded border-border text-primary focus:ring-primary/20 disabled:opacity-50"
                  />
                </Table.Head>
                <Table.Head class="p-4">Date de réception</Table.Head>
                <Table.Head class="p-4">N° Chèque</Table.Head>
                <Table.Head class="p-4">Banque</Table.Head>
                <Table.Head class="p-4">Émetteur</Table.Head>
                <Table.Head class="p-4">Adhérent associé</Table.Head>
                <Table.Head class="p-4 text-right">Montant</Table.Head>
                <Table.Head class="p-4 text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body class="divide-y divide-border">
              {#each filteredChecks as check}
                <Table.Row class="hover:bg-muted/50 transition-colors">
                  <Table.Cell class="p-4">
                    <input
                      type="checkbox"
                      bind:checked={selectedCheckIds[check.id]}
                      disabled={isClosed}
                      class="rounded border-border text-primary focus:ring-primary/20 disabled:opacity-50"
                    />
                  </Table.Cell>
                  <Table.Cell class="p-4 text-muted-foreground">
                    {new Date(check.createdAt).toLocaleDateString('fr-FR')}
                  </Table.Cell>
                  <Table.Cell class="p-4 font-mono font-medium">{check.number}</Table.Cell>
                  <Table.Cell class="p-4">{check.bank || '—'}</Table.Cell>
                  <Table.Cell class="p-4 font-medium">{check.emitter}</Table.Cell>
                  <Table.Cell class="p-4">
                    {#if check.memberId && check.memberName}
                      <a
                        href={`/admin/members/${check.memberLicence}?season=${selectedSeason}`}
                        class="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
                      >
                        <Link class="h-3 w-3" />
                        {check.memberName}
                      </a>
                    {:else}
                      <span class="text-xs text-muted-foreground italic">Non associé</span>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="p-4 text-right font-semibold text-foreground">
                    {(check.amount / 100).toFixed(2)} €
                  </Table.Cell>
                  <Table.Cell class="p-4 text-right relative">
                    {#if !isClosed}
                      <div class="inline-block text-left">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onclick={(e) => toggleDropdown(`check-${check.id}`, e)} 
                          class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                          aria-label="Actions"
                        >
                          <MoreVertical class="w-4 h-4" />
                        </Button>

                        {#if openDropdownId === `check-${check.id}`}
                          <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border animate-in fade-in duration-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => handleDeleteCheck(check.id)}
                              class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                              Supprimer
                            </Button>
                          </div>
                        {/if}
                      </div>
                    {:else}
                      <span class="text-xs text-muted-foreground italic">Aucune</span>
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={8} class="text-center py-12 text-muted-foreground">
                    <FileText class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    Aucun chèque en attente pour cette saison.
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Deposits slips list -->
    <Card.Root class="overflow-hidden shadow-sm">
      <Card.Content class="p-0">
        <div class="overflow-x-auto min-h-[220px]">
          <Table.Root class="w-full text-left border-collapse text-sm">
            <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
              <Table.Row>
                <Table.Head class="p-4">Date de dépôt</Table.Head>
                <Table.Head class="p-4">Référence</Table.Head>
                <Table.Head class="p-4">Statut</Table.Head>
                <Table.Head class="p-4 text-right">Montant Total</Table.Head>
                <Table.Head class="p-4">Rapprochement Bancaire</Table.Head>
                <Table.Head class="p-4 text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body class="divide-y divide-border">
              {#each checkDeposits as dep}
                <Table.Row class="hover:bg-muted/50 transition-colors">
                  <Table.Cell class="p-4 text-muted-foreground">
                    {new Date(dep.date).toLocaleDateString('fr-FR')}
                  </Table.Cell>
                  <Table.Cell class="p-4 font-mono font-medium">{dep.reference}</Table.Cell>
                  <Table.Cell class="p-4">
                    {#if dep.status === 'cleared'}
                      <Badge variant="secondary" class="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-medium border-transparent">
                        <CheckCircle class="h-3 w-3" /> Cleared (Rapproché)
                      </Badge>
                    {:else}
                      <Badge variant="secondary" class="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 px-2 py-0.5 rounded-full text-xs font-medium border-transparent animate-pulse">
                        Deposited (Déposé)
                      </Badge>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="p-4 text-right font-semibold text-foreground">
                    {(dep.amount / 100).toFixed(2)} €
                  </Table.Cell>
                  <Table.Cell class="p-4">
                    {#if dep.status === 'cleared'}
                      <span class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle class="w-3.5 h-3.5" />
                        Rapproché (SG #{dep.bankTransactionId})
                      </span>
                    {:else}
                      <span class="text-xs text-muted-foreground italic font-medium">Non rapproché</span>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="p-4 text-right relative">
                    <div class="inline-block text-left font-normal">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onclick={(e) => toggleDropdown(`deposit-${dep.id}`, e)} 
                        class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                        aria-label="Actions"
                      >
                        <MoreVertical class="w-4 h-4" />
                      </Button>

                      {#if openDropdownId === `deposit-${dep.id}`}
                        <div class="absolute right-4 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border animate-in fade-in duration-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onclick={() => {
                              selectedDepositToView = dep;
                              showViewDepositModal = true;
                            }}
                            class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                          >
                            <FileText class="w-3.5 h-3.5" />
                            Consulter / Imprimer
                          </Button>
                          
                          {#if dep.status !== 'cleared' && !isClosed}
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => {
                                selectedDepositToClear = dep;
                                showClearModal = true;
                              }}
                              class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-primary hover:bg-primary/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                            >
                              <CheckCircle class="w-3.5 h-3.5" />
                              Rapprocher (SG)
                            </Button>
                          {/if}

                          {#if !isClosed}
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => handleDeleteDeposit(dep.id)}
                              class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                              Supprimer la remise
                            </Button>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={6} class="text-center py-12 text-muted-foreground">
                    <FileText class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    Aucun bordereau de remise enregistré.
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Modal 1: Register Check with Photo upload & OCR -->
<Dialog.Root bind:open={showAddCheckModal}>
  <Dialog.Content class="w-full max-w-lg p-0 bg-card border-border overflow-hidden">
    <Dialog.Header class="p-6 border-b border-border">
      <Dialog.Title>Enregistrer un Chèque</Dialog.Title>
      <Dialog.Description class="hidden">Enregistrement d'un chèque physique avec assistance IA optionnelle par photo.</Dialog.Description>
    </Dialog.Header>

    <div class="p-6 overflow-y-auto max-h-[70vh] space-y-4">
      <!-- Photo/Camera Upload section -->
      <div class="space-y-2">
        <label for="photo-capture-input" class="block text-sm font-semibold text-foreground">Prise de photo du chèque (OCR IA)</label>
        <Button
          variant="outline"
          onclick={() => fileInput?.click()}
          class="w-full h-auto border-2 border-dashed border-border hover:border-primary rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-all flex flex-col items-center justify-center gap-2 relative {isAnalyzing ? 'pointer-events-none opacity-50' : ''}"
        >
          {#if isAnalyzing}
            <Loader2 class="h-8 w-8 text-primary animate-spin" />
            <span class="text-sm font-semibold text-primary">Analyse du chèque par l'IA en cours...</span>
            <span class="text-xs text-muted-foreground">Extraction du numéro, montant, émetteur et de la banque.</span>
          {:else}
            <UploadCloud class="h-8 w-8 text-muted-foreground" />
            <span class="text-sm font-medium text-foreground">Prendre en photo ou glisser l'image du chèque</span>
            <span class="text-xs text-muted-foreground">Format JPG, PNG, WEBP. Détection automatique.</span>
          {/if}
        </Button>
        <input
          id="photo-capture-input"
          type="file"
          accept="image/*"
          capture="environment"
          bind:this={fileInput}
          onchange={handlePhotoSelected}
          class="hidden"
        />
      </div>

      {#if formError}
        <Alert.Root variant="destructive">
          <Alert.Description>{formError}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if matchedMemberName && checkMemberId}
        <Alert.Root class="bg-primary/10 border-primary/20 text-primary">
          <Alert.Description class="flex justify-between items-center text-xs w-full">
            <span>Adhérent détecté : <strong>{matchedMemberName}</strong></span>
            <Badge variant="secondary" class="bg-primary/20 hover:bg-primary/20 text-primary border-transparent">Automatiquement sélectionné</Badge>
          </Alert.Description>
        </Alert.Root>
      {/if}

      <div class="relative flex py-2 items-center">
        <div class="flex-grow border-t border-border"></div>
        <span class="flex-shrink mx-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Ou Saisir Manuellement</span>
        <div class="flex-grow border-t border-border"></div>
      </div>

      <!-- Manual form fields -->
      <form onsubmit={handleAddCheck} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="check-num" class="text-xs font-semibold text-muted-foreground uppercase">N° de chèque (7 chiffres)</label>
            <Input
              id="check-num"
              type="text"
              bind:value={checkNumber}
              placeholder="Ex: 1234567"
              class="font-mono"
              required
            />
          </div>
          <div class="space-y-1">
            <label for="check-amt" class="text-xs font-semibold text-muted-foreground uppercase">Montant (€)</label>
            <Input
              id="check-amt"
              type="number"
              step="0.01"
              bind:value={checkAmount}
              placeholder="Ex: 150.00"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="check-emitter" class="text-xs font-semibold text-muted-foreground uppercase">Émetteur (Nom sur le chèque)</label>
            <Input
              id="check-emitter"
              type="text"
              bind:value={checkEmitter}
              placeholder="Ex: Dupont Marc"
              required
            />
          </div>
          <div class="space-y-1">
            <label for="check-bank" class="text-xs font-semibold text-muted-foreground uppercase">Banque (optionnel)</label>
            <Input
              id="check-bank"
              type="text"
              bind:value={checkBank}
              placeholder="Ex: LCL, SG..."
            />
          </div>
        </div>

        <div class="space-y-1 relative">
          <label for="check-member-input" class="text-xs font-semibold text-muted-foreground uppercase">Adhérent concerné (pour rapprochement cotisation)</label>
          <div class="relative">
            <Input
              id="check-member-input"
              type="text"
              placeholder="🔍 Rechercher un adhérent par nom ou licence..."
              class="pr-8 font-medium"
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
            {#if checkMemberId}
              <Button
                variant="ghost"
                size="icon-xs"
                onclick={() => {
                  checkMemberId = '';
                  memberSearchQuery = '';
                  matchedMemberName = '';
                }}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Effacer la sélection"
              >
                ✕
              </Button>
            {/if}
          </div>

          {#if isMemberDropdownOpen}
            <div class="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg divide-y divide-border">
              {#each memberOptions as member}
                <Button
                  variant="ghost"
                  class="w-full text-left justify-start rounded-none px-3 py-2 text-sm hover:bg-muted text-foreground transition-colors font-medium border-0 cursor-pointer bg-popover"
                  onmousedown={() => {
                    checkMemberId = member.id.toString();
                    memberSearchQuery = `${member.lastName} ${member.firstName} (${member.licence})`;
                    isMemberDropdownOpen = false;
                  }}
                >
                  {member.lastName} {member.firstName} ({member.licence})
                  {member.parent1Name ? ` - Parent: ${member.parent1Name}` : ''}
                </Button>
              {:else}
                <div class="px-3 py-2 text-xs text-muted-foreground italic bg-popover">Aucun adhérent trouvé</div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1 relative">
            <label for="check-cat-input" class="text-xs font-semibold text-muted-foreground uppercase">Affectation / Catégorie</label>
            <div class="relative">
              <Input
                id="check-cat-input"
                type="text"
                placeholder="Filtrer les affectations..."
                class="pr-6 font-medium"
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
              <span class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-[8px]">▼</span>
            </div>

            {#if isCategoryDropdownOpen}
              <div class="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg divide-y divide-border">
                {#each filteredCategories as cat}
                  <Button
                    variant="ghost"
                    class="w-full text-left justify-start rounded-none px-3 py-2 text-sm hover:bg-muted text-foreground transition-colors font-medium border-0 cursor-pointer bg-popover"
                    onmousedown={() => {
                      checkCategory = cat.id;
                      categorySearchQuery = cat.name;
                      isCategoryDropdownOpen = false;
                    }}
                  >
                    {cat.name}
                  </Button>
                {:else}
                  <div class="px-3 py-2 text-xs text-muted-foreground italic bg-popover">Aucune catégorie trouvée</div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="space-y-1">
            <label for="check-date" class="text-xs font-semibold text-muted-foreground uppercase">Date d'émission</label>
            <Input
              id="check-date"
              type="date"
              bind:value={checkDate}
              required
            />
          </div>
        </div>

        <Dialog.Footer class="pt-4 border-t border-border flex justify-end gap-2">
          <Button
            variant="outline"
            onclick={() => showAddCheckModal = false}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmittingCheck}
            class="flex items-center gap-2"
          >
            {#if isSubmittingCheck}
              <Loader2 class="h-4 w-4 animate-spin" />
            {/if}
            Enregistrer
          </Button>
        </Dialog.Footer>
      </form>
    </div>
  </Dialog.Content>
</Dialog.Root>

<!-- Modal 2: Create Deposit Slip -->
<Dialog.Root bind:open={showCreateDepositModal}>
  <Dialog.Content class="w-full max-w-md p-0 bg-card border-border overflow-hidden">
    <Dialog.Header class="p-6 border-b border-border">
      <Dialog.Title>Générer un Bordereau de Remise</Dialog.Title>
      <Dialog.Description class="hidden">Création d'un bordereau de remise de chèque bancaire.</Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleCreateDeposit} class="p-6 space-y-4">
      <div class="p-4 bg-muted/55 rounded-lg border border-border space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Nombre de chèques :</span>
          <span class="font-bold text-foreground">{selectedChecksList.length}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Montant Total :</span>
          <span class="font-bold text-primary text-base">{(totalSelectedAmount / 100).toFixed(2)} €</span>
        </div>
      </div>

      <div class="space-y-1">
        <label for="dep-ref" class="text-xs font-semibold text-muted-foreground uppercase">Référence du dépôt</label>
        <Input
          id="dep-ref"
          type="text"
          bind:value={depositReference}
          class="font-mono"
          required
        />
      </div>

      <div class="space-y-1">
        <label for="dep-date" class="text-xs font-semibold text-muted-foreground uppercase">Date de dépôt</label>
        <Input
          id="dep-date"
          type="date"
          bind:value={depositDate}
          required
        />
      </div>

      <Dialog.Footer class="pt-4 border-t border-border flex justify-end gap-2">
        <Button
          variant="outline"
          onclick={() => showCreateDepositModal = false}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmittingDeposit}
          class="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
        >
          {#if isSubmittingDeposit}
            <Loader2 class="h-4 w-4 animate-spin" />
          {/if}
          Générer le Bordereau
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Modal 3: Clear Deposit slip with Bank Statement line -->
<Dialog.Root bind:open={showClearModal}>
  <Dialog.Content class="w-full max-w-md p-0 bg-card border-border overflow-hidden">
    <Dialog.Header class="p-6 border-b border-border">
      <Dialog.Title>Rapprocher la Remise de Chèques</Dialog.Title>
      <Dialog.Description class="hidden">Rapprochement bancaire pour la remise de chèques.</Dialog.Description>
    </Dialog.Header>

    {#if selectedDepositToClear}
      <form onsubmit={handleClearDeposit} class="p-6 space-y-4">
        <div class="p-4 bg-muted/55 rounded-lg border border-border space-y-1">
          <div class="text-xs text-muted-foreground uppercase font-semibold">Remise sélectionnée</div>
          <div class="font-mono text-sm text-foreground">{selectedDepositToClear.reference}</div>
          <div class="text-base font-bold text-primary">{(selectedDepositToClear.amount / 100).toFixed(2)} €</div>
        </div>

        <div class="space-y-1">
          <label for="bank-tx-select" class="text-xs font-semibold text-muted-foreground uppercase">Ligne de crédit correspondante (Relevé bancaire)</label>
          <select
            id="bank-tx-select"
            bind:value={selectedBankTransactionId}
            class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            required
          >
            <option value="">-- Sélectionner l'écriture de crédit bancaire --</option>
            {#each pendingBankTransactions as tx}
              <option value={tx.id}>
                {new Date(tx.date).toLocaleDateString('fr-FR')} - {tx.name} ({(tx.amount / 100).toFixed(2)} €)
              </option>
            {:else}
              <option value="" disabled>Aucune transaction de crédit non pointée sur ce compte.</option>
            {/each}
          </select>
        </div>

        <Dialog.Footer class="pt-4 border-t border-border flex justify-end gap-2">
          <Button
            variant="outline"
            onclick={() => { showClearModal = false; selectedDepositToClear = null; }}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmittingClear || !selectedBankTransactionId}
            class="flex items-center gap-2"
          >
            {#if isSubmittingClear}
              <Loader2 class="h-4 w-4 animate-spin" />
            {/if}
            Valider le Rapprochement
          </Button>
        </Dialog.Footer>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- Modal 4: View / Print deposit slip details -->
<Dialog.Root bind:open={showViewDepositModal}>
  <Dialog.Content class="w-full max-w-3xl p-0 bg-card border-border overflow-hidden">
    <Dialog.Header class="p-6 border-b border-border">
      <Dialog.Title>Bordereau de Remise de Chèques</Dialog.Title>
      <Dialog.Description class="hidden">Aperçu avant impression du bordereau.</Dialog.Description>
    </Dialog.Header>

    {#if selectedDepositToView}
      <!-- Printable Slip Area -->
      <div class="p-8 overflow-y-auto max-h-[60vh] space-y-6" id="printable-slip">
        <!-- Logo and Club details -->
        <div class="flex justify-between items-start border-b-2 border-primary pb-4">
          <div>
            <h3 class="text-xl font-extrabold text-foreground tracking-tight">NBA 91</h3>
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nozay Badminton Associatif</p>
            <p class="text-[10px] text-muted-foreground">Mairie de Nozay, 91620 Nozay</p>
          </div>
          <div class="text-right">
            <h4 class="text-sm font-bold text-foreground uppercase tracking-wider">Bordereau de Remise</h4>
            <p class="text-xs font-mono font-bold mt-1 text-primary">{selectedDepositToView.reference}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Date : {new Date(selectedDepositToView.date).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <!-- Bank details summary -->
        <div class="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg border border-border text-xs">
          <div>
            <span class="text-muted-foreground font-medium">Bénéficiaire :</span>
            <span class="font-bold text-foreground block mt-0.5">Nozay Badminton Associatif</span>
          </div>
          <div>
            <span class="text-muted-foreground font-medium">Compte de dépôt :</span>
            <span class="font-bold text-foreground block mt-0.5">Société Générale (Compte Courant)</span>
          </div>
        </div>

        <!-- Table of checks -->
        <div class="space-y-2">
          <h5 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Liste des chèques ({checksInViewDeposit.length})</h5>
          <Table.Root class="w-full text-left border-collapse text-xs border border-border">
            <Table.Header>
              <Table.Row class="bg-muted border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                <Table.Head class="py-2.5 px-3 w-10 border-r border-border text-center">N°</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">Émetteur</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">Banque</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">N° Chèque</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">Adhérent associé</Table.Head>
                <Table.Head class="py-2.5 px-3 text-right">Montant</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body class="divide-y divide-border">
              {#each checksInViewDeposit as check, idx}
                <Table.Row class="hover:bg-muted/10 transition-colors">
                  <Table.Cell class="py-2 px-3 border-r border-border text-center font-medium text-muted-foreground">{idx + 1}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border font-semibold text-foreground">{check.emitter}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border">{check.bank || '—'}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border font-mono font-medium">{check.number}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border">
                    {check.memberName || '—'}
                  </Table.Cell>
                  <Table.Cell class="py-2 px-3 font-semibold text-right text-foreground">
                    {(check.amount / 100).toFixed(2)} €
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={6} class="text-center py-8 text-muted-foreground italic">Aucun chèque dans cette remise.</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>

        <!-- Summary Totals & signatures -->
        <div class="grid grid-cols-2 gap-8 pt-4">
          <!-- Totals Box -->
          <div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col justify-center space-y-2 h-fit">
            <div class="flex justify-between text-xs">
              <span class="text-muted-foreground font-medium">Nombre de chèques :</span>
              <span class="font-bold text-foreground">{checksInViewDeposit.length}</span>
            </div>
            <div class="flex justify-between items-center text-sm border-t border-primary/20 pt-2">
              <span class="text-muted-foreground font-bold">MONTANT TOTAL DE LA REMISE :</span>
              <span class="font-black text-primary text-lg">{(selectedDepositToView.amount / 100).toFixed(2)} €</span>
            </div>
          </div>

          <!-- Signatures area -->
          <div class="border border-border rounded-xl p-4 space-y-8 text-[10px] text-muted-foreground">
            <div class="flex justify-between">
              <span>Signature du trésorier :</span>
              <span>Fait à Nozay, le ___/___/______</span>
            </div>
            <div class="h-8"></div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <Dialog.Footer class="p-6 border-t border-border flex justify-end gap-2 shrink-0">
        <Button
          variant="outline"
          onclick={() => { showViewDepositModal = false; selectedDepositToView = null; }}
        >
          Fermer
        </Button>
        <Button
          onclick={() => window.print()}
        >
          Imprimer le Bordereau
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  @media print {
    :global(body) {
      background-color: white !important;
    }
    :global(body *) {
      visibility: hidden !important;
    }
    #printable-slip, #printable-slip * {
      visibility: visible !important;
    }
    #printable-slip {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      background: white !important;
      color: black !important;
    }
  }
</style>

