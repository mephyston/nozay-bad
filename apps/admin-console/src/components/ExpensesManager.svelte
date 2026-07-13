<script lang="ts">
  import { Coins, FileText, Check, X, Calendar, AlertCircle, Eye, Search, Edit2, Image as ImageIcon } from 'lucide-svelte';

  interface Expense {
    id: number;
    seasonId: string;
    description: string;
    category: string;
    amount: number;
    photoUrl: string | null;
    status: 'pending' | 'approved' | 'rejected';
    emitterName: string;
    memberId: number | null;
    transactionId: number | null;
    createdAt: string;
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
  }

  let {
    expenses = [],
    seasonId,
    seasons = []
  }: {
    expenses: Expense[];
    seasonId: string;
    seasons?: Season[];
  } = $props();

  let activeTab = $state<'pending' | 'history'>('pending');
  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  let searchTerm = $state('');
  let selectedPhoto = $state<string | null>(null);

  let submittingId = $state<number | null>(null);
  let errorMsg = $state('');
  let successMsg = $state('');

  // Editing state
  let editingId = $state<number | null>(null);
  let editDescription = $state('');
  let editCategory = $state('');
  let editAmountStr = $state('');
  let isSaving = $state(false);

  const categoriesList = [
    { value: 'fonctionnement_administratif', label: 'Frais de fonctionnement & administratif' },
    { value: 'materiel_club', label: 'Matériel (hors cordages)' },
    { value: 'volants', label: 'Volants (vente ou achat)' },
    { value: 'evenements_buvettes', label: 'Evénements & Buvettes' },
    { value: 'championnats', label: 'Championnats (frais équipes)' },
    { value: 'stages_formations', label: 'Stages & Formations' },
    { value: 'adhesions_inscriptions', label: 'Adhésions & Inscriptions' },
    { value: 'sponsoring', label: 'Sponsoring' },
    { value: 'subventions', label: 'Subventions (aides publiques)' },
    { value: 'actions_jeunes', label: 'Actions Jeunes (stages jeunes...)' },
    { value: 'tournois_senior', label: 'Tournois Senior' },
    { value: 'cordage_vente', label: 'Cordage (vente aux adhérents)' },
    { value: 'salaires_charges', label: 'Salaires et Charges' },
    { value: 'licences_federation', label: 'Licences (versements fédération)' }
  ];

  const categoryLabels: Record<string, string> = {
    fonctionnement_administratif: 'Frais de fonctionnement & administratif',
    materiel_club: 'Matériel (hors cordages)',
    volants: 'Volants (vente ou achat)',
    evenements_buvettes: 'Evénements & Buvettes',
    championnats: 'Championnats (frais équipes)',
    stages_formations: 'Stages & Formations',
    adhesions_inscriptions: 'Adhésions & Inscriptions',
    sponsoring: 'Sponsoring',
    subventions: 'Subventions (aides publiques)',
    actions_jeunes: 'Actions Jeunes (stages jeunes...)',
    tournois_senior: 'Tournois Senior',
    cordage_vente: 'Cordage (vente aux adhérents)',
    salaires_charges: 'Salaires et Charges',
    licences_federation: 'Licences (versements fédération)'
  };

  const categoryColors: Record<string, string> = {
    fonctionnement_administratif: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    materiel_club: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    volants: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    evenements_buvettes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    championnats: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    stages_formations: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    adhesions_inscriptions: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    sponsoring: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    subventions: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    actions_jeunes: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    tournois_senior: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    cordage_vente: 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20',
    salaires_charges: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    licences_federation: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20'
  };

  // Filter and search
  const pendingExpenses = $derived(
    expenses
      .filter(e => e.status === 'pending')
      .filter(e => 
        e.emitterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const historyExpenses = $derived(
    expenses
      .filter(e => e.status !== 'pending')
      .filter(e => 
        e.emitterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  function handleSeasonChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    window.location.search = `?season=${target.value}`;
  }

  function startEdit(exp: Expense) {
    editingId = exp.id;
    editDescription = exp.description;
    editCategory = exp.category;
    editAmountStr = (exp.amount / 100).toFixed(2);
  }

  async function saveEdit(id: number) {
    const parsedAmount = parseFloat(editAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errorMsg = "Veuillez saisir un montant supérieur à 0 €.";
      return;
    }

    isSaving = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id,
          updates: {
            description: editDescription,
            category: editCategory,
            amount: Math.round(parsedAmount * 100)
          }
        })
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour de la note de frais.");
      }

      successMsg = "Note de frais mise à jour avec succès.";
      editingId = null;
      // Reload page to refresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || "Une erreur est survenue.";
    } finally {
      isSaving = false;
    }
  }

  async function handleAction(id: number, action: 'approve' | 'reject') {
    submittingId = id;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id })
      });

      if (!res.ok) {
        throw new Error(action === 'approve' ? "Erreur lors de l'approbation" : "Erreur lors du rejet");
      }

      successMsg = action === 'approve' ? "Note de frais approuvée et remboursée avec succès." : "Note de frais rejetée.";
      // Reload page to refresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || "Une erreur est survenue.";
    } finally {
      submittingId = null;
    }
  }
</script>

<div class="space-y-6">
  <!-- Season selector and Search -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
    <div class="flex items-center gap-3">
      <Coins class="w-5 h-5 text-primary" />
      <span class="font-semibold text-foreground">Saison de comptabilisation :</span>
      <select
        value={selectedSeason}
        onchange={handleSeasonChange}
        class="bg-background border border-border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
      >
        {#each seasons as s}
          <option value={s.id}>{s.name}</option>
        {/each}
      </select>
    </div>

    <div class="relative w-full sm:w-72">
      <input
        type="text"
        placeholder="Rechercher par nom, motif..."
        bind:value={searchTerm}
        class="w-full pl-9 pr-4 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
      />
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  </div>

  {#if successMsg}
    <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg flex items-center gap-2">
      <Check class="w-4 h-4" />
      <span>{successMsg}</span>
    </div>
  {/if}

  {#if errorMsg}
    <div class="p-4 bg-destructive/15 border border-destructive text-destructive text-sm rounded-lg flex items-center gap-2">
      <AlertCircle class="w-4 h-4" />
      <span>{errorMsg}</span>
    </div>
  {/if}

  <!-- Tab navigation -->
  <div class="border-b border-border flex items-center justify-between">
    <div class="flex gap-4">
      <button
        type="button"
        onclick={() => activeTab = 'pending'}
        class={`pb-3 text-sm font-semibold border-b-2 transition-all relative bg-transparent border-0 cursor-pointer ${
          activeTab === 'pending'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        En attente
        {#if expenses.filter(e => e.status === 'pending').length > 0}
          <span class="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
            {expenses.filter(e => e.status === 'pending').length}
          </span>
        {/if}
      </button>
      <button
        type="button"
        onclick={() => activeTab = 'history'}
        class={`pb-3 text-sm font-semibold border-b-2 transition-all bg-transparent border-0 cursor-pointer ${
          activeTab === 'history'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        Historique / Traités
      </button>
    </div>
  </div>

  <!-- Expenses lists -->
  {#if activeTab === 'pending'}
    {#if pendingExpenses.length === 0}
      <div class="text-center py-16 bg-card border border-border rounded-xl">
        <FileText class="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
        <h3 class="text-lg font-bold text-foreground">Aucune note de frais en attente</h3>
        <p class="text-sm text-muted-foreground mt-1">Toutes les dépenses soumises ont été validées ou rejetées.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each pendingExpenses as exp}
          <div class="bg-card border border-border hover:border-border/80 transition-all rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
            {#if editingId === exp.id}
              <!-- EDIT MODE CARD -->
              <div class="p-5 space-y-4">
                <div class="flex justify-between items-center border-b border-border pb-2">
                  <h4 class="font-bold text-md text-foreground">Modifier la demande - {exp.emitterName}</h4>
                  <span class="text-xs text-muted-foreground">ID: #{exp.id}</span>
                </div>

                <div class="space-y-1.5">
                  <label for="edit-desc-{exp.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Motif / Description</label>
                  <textarea
                    id="edit-desc-{exp.id}"
                    bind:value={editDescription}
                    rows="3"
                    class="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    required
                  ></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label for="edit-cat-{exp.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Catégorie compta</label>
                    <select
                      id="edit-cat-{exp.id}"
                      bind:value={editCategory}
                      class="w-full px-2.5 py-2 border border-border bg-background rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      {#each categoriesList as cat}
                        <option value={cat.value}>{cat.label}</option>
                      {/each}
                    </select>
                  </div>

                  <div class="space-y-1.5">
                    <label for="edit-amount-{exp.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant (€)</label>
                    <input
                      type="number"
                      id="edit-amount-{exp.id}"
                      step="0.01"
                      min="0.01"
                      bind:value={editAmountStr}
                      class="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                      required
                    />
                  </div>
                </div>

                <!-- Justificatif preview in Edit Mode -->
                {#if exp.photoUrl}
                  <div class="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/60">
                    <span class="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <ImageIcon class="w-3.5 h-3.5" />
                      Justificatif chargé
                    </span>
                    <button
                      type="button"
                      onclick={() => selectedPhoto = exp.photoUrl}
                      class="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                    >
                      <Eye class="w-3 h-3" />
                      Visualiser
                    </button>
                  </div>
                {/if}
              </div>

              <!-- Edit Actions Row -->
              <div class="border-t border-border bg-muted/20 px-5 py-3.5 flex justify-end gap-3">
                <button
                  type="button"
                  onclick={() => editingId = null}
                  disabled={isSaving}
                  class="px-4 py-2 border border-border hover:bg-muted text-sm font-semibold rounded-lg transition-colors cursor-pointer bg-background"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onclick={() => saveEdit(exp.id)}
                  disabled={isSaving}
                  class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {#if isSaving}
                    <span>Enregistrement...</span>
                  {:else}
                    <span>Enregistrer</span>
                  {/if}
                </button>
              </div>
            {:else}
              <!-- STANDARD MODE CARD -->
              <div class="p-5 space-y-4">
                <!-- Top Row -->
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-bold text-lg text-foreground">{exp.emitterName}</h4>
                    <span class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar class="w-3.5 h-3.5" />
                      Soumis le {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-2xl font-black text-primary font-mono">
                      {(exp.amount / 100).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <!-- Category Badge -->
                <div>
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
                    {categoryLabels[exp.category] || exp.category}
                  </span>
                </div>

                <!-- Description -->
                <div class="text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                  <p class="whitespace-pre-wrap">{exp.description}</p>
                </div>

                <!-- Justificatif preview -->
                {#if exp.photoUrl}
                  <div class="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/60">
                    <span class="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon class="w-4 h-4" />
                      Justificatif de dépense
                    </span>
                    <button
                      type="button"
                      onclick={() => selectedPhoto = exp.photoUrl}
                      class="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                    >
                      <Eye class="w-3.5 h-3.5" />
                      Visualiser
                    </button>
                  </div>
                {/if}
              </div>

              <!-- Actions Row -->
              <div class="border-t border-border bg-muted/20 px-5 py-3.5 flex justify-between items-center gap-3">
                <button
                  type="button"
                  onclick={() => startEdit(exp)}
                  disabled={submittingId !== null}
                  class="px-4 py-2 border border-border hover:bg-muted text-sm font-semibold rounded-lg transition-colors cursor-pointer bg-background flex items-center gap-1.5"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                  Modifier
                </button>

                <div class="flex gap-3">
                  <button
                    type="button"
                    onclick={() => handleAction(exp.id, 'reject')}
                    disabled={submittingId !== null}
                    class="px-4 py-2 border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive text-sm font-semibold rounded-lg transition-colors cursor-pointer bg-background"
                  >
                    Rejeter
                  </button>
                  <button
                    type="button"
                    onclick={() => handleAction(exp.id, 'approve')}
                    disabled={submittingId !== null}
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {#if submittingId === exp.id}
                      <span class="animate-pulse">Validation...</span>
                    {:else}
                      <Check class="w-4 h-4" />
                      Rembourser
                    {/if}
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <!-- History Tab -->
    {#if historyExpenses.length === 0}
      <div class="text-center py-16 bg-card border border-border rounded-xl">
        <FileText class="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
        <h3 class="text-lg font-bold text-foreground">Aucun historique</h3>
        <p class="text-sm text-muted-foreground mt-1">Les dépenses approuvées ou rejetées apparaîtront ici.</p>
      </div>
    {:else}
      <div class="overflow-x-auto bg-card border border-border rounded-xl shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-border text-xs text-muted-foreground font-bold uppercase tracking-wider bg-muted/30">
              <th class="py-3.5 px-4">Date</th>
              <th class="py-3.5 px-4">Bénéficiaire</th>
              <th class="py-3.5 px-4">Motif</th>
              <th class="py-3.5 px-4">Catégorie</th>
              <th class="py-3.5 px-4">Montant</th>
              <th class="py-3.5 px-4">Justificatif</th>
              <th class="py-3.5 px-4 text-right">Statut</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each historyExpenses as exp}
              <tr class="hover:bg-muted/10 transition-colors text-sm">
                <td class="py-3.5 px-4 text-muted-foreground">
                  {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td class="py-3.5 px-4 font-bold text-foreground">
                  {exp.emitterName}
                </td>
                <td class="py-3.5 px-4 max-w-xs truncate" title={exp.description}>
                  {exp.description}
                </td>
                <td class="py-3.5 px-4">
                  <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
                    {categoryLabels[exp.category] || exp.category}
                  </span>
                </td>
                <td class="py-3.5 px-4 font-mono font-bold text-foreground font-semibold">
                  {(exp.amount / 100).toFixed(2)} €
                </td>
                <td class="py-3.5 px-4">
                  {#if exp.photoUrl}
                    <button
                      type="button"
                      onclick={() => selectedPhoto = exp.photoUrl}
                      class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                    >
                      <Eye class="w-3.5 h-3.5" />
                      Visualiser
                    </button>
                  {:else}
                    <span class="text-xs text-muted-foreground">Aucun</span>
                  {/if}
                </td>
                <td class="py-3.5 px-4 text-right">
                  {#if exp.status === 'approved'}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Remboursé
                    </span>
                  {:else}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                      Rejeté
                    </span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<!-- Modal Photo Viewer -->
{#if selectedPhoto}
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-card border border-border rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <div class="border-b border-border px-5 py-4 flex justify-between items-center bg-muted/20">
        <h3 class="font-bold text-foreground flex items-center gap-2">
          <ImageIcon class="w-5 h-5 text-primary" />
          Justificatif de la dépense
        </h3>
        <button
          type="button"
          onclick={() => selectedPhoto = null}
          class="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors bg-transparent border-0 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="p-6 overflow-y-auto flex items-center justify-center bg-muted/10 flex-1">
        <img src={selectedPhoto} alt="Justificatif de dépense" class="max-w-full max-h-[50vh] rounded-lg shadow-md object-contain border border-border" />
      </div>
      <div class="border-t border-border px-5 py-3.5 flex justify-end bg-muted/20">
        <button
          type="button"
          onclick={() => selectedPhoto = null}
          class="px-4 py-2 bg-background hover:bg-muted border border-border text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
{/if}
