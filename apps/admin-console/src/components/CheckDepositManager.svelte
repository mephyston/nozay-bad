<script lang="ts">
  import { Wallet, FileText, CheckCircle, Trash2, Camera, UploadCloud, Search, ArrowRight, Loader2, Link } from 'lucide-svelte';

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
    seasons: { id: string; name: string; active: boolean }[];
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

  // Add Check Form State
  let showAddCheckModal = $state(false);
  let isAnalyzing = $state(false);
  let isSubmittingCheck = $state(false);
  let checkNumber = $state('');
  let checkAmount = $state('');
  let checkEmitter = $state('');
  let checkBank = $state('');
  let checkMemberId = $state<string>('');
  let checkCategory = $state('adhesions_inscriptions');
  let formError = $state('');

  // Search filter for checks & members in select
  let checkSearchQuery = $state('');
  let memberSearchQuery = $state('');

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
      } else {
        throw new Error(json.error || 'Erreur lors de la lecture des données.');
      }
    } catch (err: any) {
      console.error(err);
      formError = "L'analyse IA a échoué. Vous pouvez saisir les informations manuellement.";
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
          category: checkCategory
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
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border border-border">
    <div>
      <h1 class="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        Remise de Chèques
      </h1>
      <p class="text-sm text-muted-foreground">
        Gestion et suivi des chèques physiques, génération de bordereaux de remise et rapprochement bancaire.
      </p>
    </div>

    <!-- Season Selector -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-muted-foreground">Saison :</span>
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
  </div>

  <!-- Main Tabs Navigation -->
  <div class="border-b border-border flex items-center justify-between">
    <div class="flex gap-4">
      <button
        onclick={() => activeTab = 'checks'}
        class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px {activeTab === 'checks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        Chèques reçus ({checks.filter(c => c.status === 'received').length})
      </button>
      <button
        onclick={() => activeTab = 'deposits'}
        class="px-4 py-2 text-sm font-semibold border-b-2 transition-all outline-none -mb-px {activeTab === 'deposits' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        Bordereaux de Remise ({checkDeposits.length})
      </button>
    </div>

    {#if activeTab === 'checks'}
      <div class="flex gap-2 mb-2">
        <button
          onclick={() => showAddCheckModal = true}
          class="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
        >
          <Camera class="h-4 w-4" />
          Enregistrer un Chèque
        </button>

        {#if selectedChecksList.length > 0}
          <button
            onclick={() => showCreateDepositModal = true}
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm animate-pulse"
          >
            <FileText class="h-4 w-4" />
            Remise de {selectedChecksList.length} chèque(s) ({(totalSelectedAmount / 100).toFixed(2)} €)
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Tab Contents -->
  {#if activeTab === 'checks'}
    <!-- Checks List -->
    <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div class="p-4 border-b border-border flex items-center gap-3">
        <Search class="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par numéro, émetteur, banque, adhérent..."
          bind:value={checkSearchQuery}
          class="bg-transparent border-none text-sm w-full outline-none focus:ring-0 placeholder:text-muted-foreground text-foreground"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-muted/40 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <th class="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  checked={filteredChecks.length > 0 && filteredChecks.every(c => selectedCheckIds[c.id])}
                  onchange={(e) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    filteredChecks.forEach(c => selectedCheckIds[c.id] = checked);
                  }}
                  class="rounded border-border text-primary focus:ring-primary/20"
                />
              </th>
              <th class="py-3.5 px-4">Date de réception</th>
              <th class="py-3.5 px-4">N° Chèque</th>
              <th class="py-3.5 px-4">Banque</th>
              <th class="py-3.5 px-4">Émetteur</th>
              <th class="py-3.5 px-4">Adhérent associé</th>
              <th class="py-3.5 px-4 text-right">Montant</th>
              <th class="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each filteredChecks as check}
              <tr class="hover:bg-muted/30 transition-colors">
                <td class="py-3.5 px-4">
                  <input
                    type="checkbox"
                    bind:checked={selectedCheckIds[check.id]}
                    class="rounded border-border text-primary focus:ring-primary/20"
                  />
                </td>
                <td class="py-3.5 px-4 text-muted-foreground">
                  {new Date(check.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td class="py-3.5 px-4 font-mono font-medium">{check.number}</td>
                <td class="py-3.5 px-4">{check.bank || '—'}</td>
                <td class="py-3.5 px-4 font-medium">{check.emitter}</td>
                <td class="py-3.5 px-4">
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
                </td>
                <td class="py-3.5 px-4 text-right font-semibold text-foreground">
                  {(check.amount / 100).toFixed(2)} €
                </td>
                <td class="py-3.5 px-4 text-center">
                  <button
                    onclick={() => handleDeleteCheck(check.id)}
                    class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                    title="Supprimer le chèque"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="8" class="text-center py-12 text-muted-foreground">
                  <FileText class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  Aucun chèque en attente pour cette saison.
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <!-- Deposits slips list -->
    <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-muted/40 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <th class="py-3.5 px-4">Date de dépôt</th>
              <th class="py-3.5 px-4">Référence</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4 text-right">Montant Total</th>
              <th class="py-3.5 px-4 text-center">Rapprochement Bancaire</th>
              <th class="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each checkDeposits as dep}
              <tr class="hover:bg-muted/30 transition-colors">
                <td class="py-3.5 px-4 text-muted-foreground">
                  {new Date(dep.date).toLocaleDateString('fr-FR')}
                </td>
                <td class="py-3.5 px-4 font-mono font-medium">{dep.reference}</td>
                <td class="py-3.5 px-4">
                  {#if dep.status === 'cleared'}
                    <span class="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-xs font-medium">
                      <CheckCircle class="h-3 w-3" /> Cleared (Rapproché)
                    </span>
                  {:else}
                    <span class="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full text-xs font-medium animate-pulse">
                      Deposited (Déposé)
                    </span>
                  {/if}
                </td>
                <td class="py-3.5 px-4 text-right font-semibold text-foreground">
                  {(dep.amount / 100).toFixed(2)} €
                </td>
                <td class="py-3.5 px-4 text-center">
                  {#if dep.status === 'cleared'}
                    <span class="text-xs text-muted-foreground">Associé à la transaction #{dep.bankTransactionId}</span>
                  {:else}
                    <button
                      onclick={() => {
                        selectedDepositToClear = dep;
                        showClearModal = true;
                      }}
                      class="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-md text-xs font-semibold transition-colors"
                    >
                      Rapprocher avec le Relevé SG
                    </button>
                  {/if}
                </td>
                <td class="py-3.5 px-4 text-center">
                  <button
                    onclick={() => handleDeleteDeposit(dep.id)}
                    class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                    title="Supprimer la remise (restaure les chèques)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="6" class="text-center py-12 text-muted-foreground">
                  <FileText class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  Aucun bordereau de remise enregistré.
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Modal 1: Register Check with Photo upload & OCR -->
{#if showAddCheckModal}
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-card border border-border w-full max-w-lg rounded-xl shadow-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
      <div class="p-6 border-b border-border flex justify-between items-center">
        <h2 class="text-lg font-bold text-foreground">Enregistrer un Chèque</h2>
        <button onclick={() => showAddCheckModal = false} class="text-muted-foreground hover:text-foreground text-sm">Fermer</button>
      </div>

      <div class="p-6 overflow-y-auto space-y-4">
        <!-- Photo/Camera Upload section -->
        <div class="space-y-2">
          <label for="photo-capture-input" class="block text-sm font-semibold text-foreground">Prise de photo du chèque (OCR IA)</label>
          <button
            type="button"
            onclick={() => fileInput?.click()}
            class="w-full border-2 border-dashed border-border hover:border-primary rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-all flex flex-col items-center justify-center gap-2 relative {isAnalyzing ? 'pointer-events-none opacity-50' : ''}"
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
          </button>
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
          <div class="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
            {formError}
          </div>
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
              <input
                id="check-num"
                type="text"
                bind:value={checkNumber}
                placeholder="Ex: 1234567"
                class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-mono"
                required
              />
            </div>
            <div class="space-y-1">
              <label for="check-amt" class="text-xs font-semibold text-muted-foreground uppercase">Montant (€)</label>
              <input
                id="check-amt"
                type="number"
                step="0.01"
                bind:value={checkAmount}
                placeholder="Ex: 150.00"
                class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label for="check-emitter" class="text-xs font-semibold text-muted-foreground uppercase">Émetteur (Nom sur le chèque)</label>
              <input
                id="check-emitter"
                type="text"
                bind:value={checkEmitter}
                placeholder="Ex: Dupont Marc"
                class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                required
              />
            </div>
            <div class="space-y-1">
              <label for="check-bank" class="text-xs font-semibold text-muted-foreground uppercase">Banque (optionnel)</label>
              <input
                id="check-bank"
                type="text"
                bind:value={checkBank}
                placeholder="Ex: LCL, SG..."
                class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="check-member" class="text-xs font-semibold text-muted-foreground uppercase">Adhérent concerné (pour rapprochement cotisation)</label>
            <div class="space-y-1">
              <input
                type="text"
                placeholder="🔍 Rechercher un adhérent..."
                bind:value={memberSearchQuery}
                class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              />
              <select
                id="check-member"
                bind:value={checkMemberId}
                class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              >
                <option value="">-- Aucun adhérent (achat divers) --</option>
                {#each filteredMembers as member}
                  <option value={member.id}>
                    {member.lastName} {member.firstName} ({member.licence})
                    {member.parent1Name ? ` - Parent: ${member.parent1Name}` : ''}
                  </option>
                {/each}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label for="check-cat" class="text-xs font-semibold text-muted-foreground uppercase">Affectation / Catégorie</label>
              <select
                id="check-cat"
                bind:value={checkCategory}
                class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              >
                <option value="adhesions_inscriptions">Cotisation / Adhésion</option>
                <option value="buvettes_recette">Recette Buvette</option>
                <option value="cordage_vente">Vente Cordage</option>
                <option value="divers_recette">Divers / Recettes annexes</option>
              </select>
            </div>
          </div>

          <div class="pt-4 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onclick={() => showAddCheckModal = false}
              class="px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-muted text-foreground transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmittingCheck}
              class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              {#if isSubmittingCheck}
                <Loader2 class="h-4 w-4 animate-spin" />
              {/if}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Modal 2: Create Deposit Slip -->
{#if showCreateDepositModal}
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-card border border-border w-full max-w-md rounded-xl shadow-lg flex flex-col animate-in fade-in zoom-in-95 duration-150">
      <div class="p-6 border-b border-border flex justify-between items-center">
        <h2 class="text-lg font-bold text-foreground">Générer un Bordereau de Remise</h2>
        <button onclick={() => showCreateDepositModal = false} class="text-muted-foreground hover:text-foreground text-sm">Fermer</button>
      </div>

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
          <input
            id="dep-ref"
            type="text"
            bind:value={depositReference}
            class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-mono"
            required
          />
        </div>

        <div class="space-y-1">
          <label for="dep-date" class="text-xs font-semibold text-muted-foreground uppercase">Date de dépôt</label>
          <input
            id="dep-date"
            type="date"
            bind:value={depositDate}
            class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            required
          />
        </div>

        <div class="pt-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onclick={() => showCreateDepositModal = false}
            class="px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-muted text-foreground transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmittingDeposit}
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            {#if isSubmittingDeposit}
              <Loader2 class="h-4 w-4 animate-spin" />
            {/if}
            Générer le Bordereau
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal 3: Clear Deposit slip with Bank Statement line -->
{#if showClearModal && selectedDepositToClear}
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-card border border-border w-full max-w-md rounded-xl shadow-lg flex flex-col animate-in fade-in zoom-in-95 duration-150">
      <div class="p-6 border-b border-border flex justify-between items-center">
        <h2 class="text-lg font-bold text-foreground">Rapprocher la Remise de Chèques</h2>
        <button onclick={() => { showClearModal = false; selectedDepositToClear = null; }} class="text-muted-foreground hover:text-foreground text-sm">Fermer</button>
      </div>

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

        <div class="pt-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onclick={() => { showClearModal = false; selectedDepositToClear = null; }}
            class="px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-muted text-foreground transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmittingClear || !selectedBankTransactionId}
            class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            {#if isSubmittingClear}
              <Loader2 class="h-4 w-4 animate-spin" />
            {/if}
            Valider le Rapprochement
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
