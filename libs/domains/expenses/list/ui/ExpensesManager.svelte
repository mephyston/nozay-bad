<script lang="ts">
  import { Coins, FileText, Check, X, Calendar, AlertCircle, Eye, Search, Edit2, Image as ImageIcon, MoreVertical, RefreshCw } from 'lucide-svelte';
  import { Button, Table, Input, Badge, Alert, Card, Textarea } from '@metacult/shared-ui';

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
    closed?: boolean;
  }

  interface Category {
    id: string;
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses: boolean;
  }

  let {
    expenses = [],
    seasonId,
    seasons = [],
    categories = []
  }: {
    expenses: Expense[];
    seasonId: string;
    seasons?: Season[];
    categories?: Category[];
  } = $props();

  let activeTab = $state<'pending' | 'history'>('pending');
  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);
  let searchTerm = $state('');
  let selectedPhoto = $state<string | null>(null);

  let submittingId = $state<number | null>(null);
  let errorMsg = $state('');
  let successMsg = $state('');

  // Editing state
  let editingId = $state<number | null>(null);
  let editDescription = $state('');
  let editCategory = $state('');
  let editSeasonId = $state('');
  let editAmountStr = $state('');
  let isSaving = $state(false);

  const fallbackCategoriesList = [
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

  const categoriesList = $derived(
    categories && categories.length > 0
      ? categories.map(c => ({ value: c.id, label: c.adminLabel }))
      : fallbackCategoriesList
  );

  const fallbackCategoryLabels: Record<string, string> = {
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

  const categoryLabels = $derived(
    categories && categories.length > 0
      ? categories.reduce((acc, c) => {
          acc[c.id] = c.adminLabel;
          return acc;
        }, {} as Record<string, string>)
      : fallbackCategoryLabels
  );

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



  function startEdit(exp: Expense) {
    editingId = exp.id;
    editDescription = exp.description;
    editCategory = exp.category;
    editSeasonId = exp.seasonId;
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
            seasonId: editSeasonId,
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

  let openDropdownId = $state<number | null>(null);

  function toggleDropdown(id: number, e: MouseEvent) {
    e.stopPropagation();
    openDropdownId = openDropdownId === id ? null : id;
  }

  $effect(() => {
    const handleGlobalClick = () => { openDropdownId = null; };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });

  async function handleCancelValidation(id: number) {
    if (!confirm("Êtes-vous sûr de vouloir remettre cette note de frais en attente ? Cela annulera son remboursement en comptabilité.")) {
      return;
    }

    submittingId = id;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id })
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'annulation de la validation.");
      }

      successMsg = "Note de frais remise en attente et transaction supprimée de la comptabilité.";
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
  <!-- Search -->
  <div class="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
    <div class="flex items-center gap-2">
      <Coins class="w-5 h-5 text-primary" />
      <span class="font-semibold text-foreground">Dépenses de la saison</span>
    </div>
    <div class="relative w-full sm:w-72">
      <Input
        type="text"
        placeholder="Rechercher par nom, motif..."
        bind:value={searchTerm}
        class="pl-9 w-full"
      />
      <Search class="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
    </div>
  </div>

  {#if successMsg}
    <Alert.Root class="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
      <Check class="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
      <Alert.Title class="text-emerald-600 dark:text-emerald-400">Succès</Alert.Title>
      <Alert.Description class="text-emerald-600 dark:text-emerald-400">{successMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4.5 h-4.5" />
      <Alert.Title>Erreur</Alert.Title>
      <Alert.Description>{errorMsg}</Alert.Description>
    </Alert.Root>
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
          <Badge class="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full h-auto">
            {expenses.filter(e => e.status === 'pending').length}
          </Badge>
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
      <Card.Root class="text-center py-16">
        <Card.Content>
          <FileText class="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
          <Card.Title class="text-lg font-bold text-foreground">Aucune note de frais en attente</Card.Title>
          <Card.Description class="text-sm text-muted-foreground mt-1">Toutes les dépenses soumises ont été validées ou rejetées.</Card.Description>
        </Card.Content>
      </Card.Root>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each pendingExpenses as exp}
          <Card.Root class="hover:border-border/80 transition-all flex flex-col justify-between shadow-sm">
            {#if editingId === exp.id}
              <!-- EDIT MODE CARD -->
              <Card.Header class="pb-2 border-b border-border flex flex-row justify-between items-center space-y-0">
                <Card.Title class="font-bold text-md text-foreground">Modifier la demande - {exp.emitterName}</Card.Title>
                <Card.Description class="text-xs text-muted-foreground">ID: #{exp.id}</Card.Description>
              </Card.Header>

              <Card.Content class="space-y-4 pt-4">
                <div class="space-y-1.5">
                  <label for="edit-desc-{exp.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Motif / Description</label>
                  <Textarea
                    id="edit-desc-{exp.id}"
                    bind:value={editDescription}
                    rows={3}
                    required
                  />
                </div>

                <div class="grid grid-cols-3 gap-4">
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
                    <label for="edit-season-{exp.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Saison d'affectation</label>
                    <select
                      id="edit-season-{exp.id}"
                      bind:value={editSeasonId}
                      class="w-full px-2.5 py-2 border border-border bg-background rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      {#each seasons as s}
                        <option value={s.id}>{s.name}</option>
                      {/each}
                    </select>
                  </div>

                  <div class="space-y-1.5">
                    <label for="edit-amount-{exp.id}" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant (€)</label>
                    <Input
                      type="number"
                      id="edit-amount-{exp.id}"
                      step="0.01"
                      min="0.01"
                      bind:value={editAmountStr}
                      class="font-semibold h-9"
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => selectedPhoto = exp.photoUrl}
                      class="text-xs font-bold text-primary hover:underline flex items-center gap-1 h-auto py-1 px-2"
                    >
                      <Eye class="w-3 h-3" />
                      Visualiser
                    </Button>
                  </div>
                {/if}
              </Card.Content>

              <!-- Edit Actions Row -->
              <Card.Footer class="border-t border-border bg-muted/20 px-5 py-3.5 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onclick={() => editingId = null}
                  disabled={isSaving}
                >
                  Annuler
                </Button>
                <Button
                  onclick={() => saveEdit(exp.id)}
                  disabled={isSaving}
                >
                  {#if isSaving}
                    <span>Enregistrement...</span>
                  {:else}
                    <span>Enregistrer</span>
                  {/if}
                </Button>
              </Card.Footer>
            {:else}
              <!-- STANDARD MODE CARD -->
              <Card.Header class="pb-2 flex flex-row justify-between items-start space-y-0">
                <div>
                  <Card.Title class="font-bold text-lg text-foreground">{exp.emitterName}</Card.Title>
                  <Card.Description class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar class="w-3.5 h-3.5" />
                    Soumis le {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
                  </Card.Description>
                </div>
                <div class="text-right">
                  <span class="text-2xl font-black text-primary font-mono">
                    {(exp.amount / 100).toFixed(2)} €
                  </span>
                </div>
              </Card.Header>

              <Card.Content class="space-y-4">
                <!-- Category Badge -->
                <div>
                  <Badge variant="outline" class={categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}>
                    {categoryLabels[exp.category] || exp.category}
                  </Badge>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => selectedPhoto = exp.photoUrl}
                      class="text-xs font-bold text-primary hover:underline flex items-center gap-1 h-auto py-1 px-2"
                    >
                      <Eye class="w-3.5 h-3.5" />
                      Visualiser
                    </Button>
                  </div>
                {/if}
              </Card.Content>

              <!-- Actions Row -->
              {#if !isClosed}
                <Card.Footer class="border-t border-border bg-muted/20 px-5 py-3.5 flex justify-between items-center gap-3">
                  <Button
                    variant="outline"
                    onclick={() => startEdit(exp)}
                    disabled={submittingId !== null}
                    class="flex items-center gap-1.5"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                    Modifier
                  </Button>

                  <div class="flex gap-3">
                    <Button
                      variant="outline"
                      onclick={() => handleAction(exp.id, 'reject')}
                      disabled={submittingId !== null}
                      class="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                    >
                      Rejeter
                    </Button>
                    <Button
                      onclick={() => handleAction(exp.id, 'approve')}
                      disabled={submittingId !== null}
                      class="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                    >
                      {#if submittingId === exp.id}
                        <span class="animate-pulse">Validation...</span>
                      {:else}
                        <Check class="w-4 h-4" />
                        Rembourser
                      {/if}
                    </Button>
                  </div>
                </Card.Footer>
              {/if}
            {/if}
          </Card.Root>
        {/each}
      </div>
    {/if}
  {:else}
    <!-- History Tab -->
    {#if historyExpenses.length === 0}
      <Card.Root class="text-center py-16">
        <Card.Content>
          <FileText class="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
          <Card.Title class="text-lg font-bold text-foreground">Aucun historique</Card.Title>
          <Card.Description class="text-sm text-muted-foreground mt-1">Les dépenses approuvées ou rejetées apparaîtront ici.</Card.Description>
        </Card.Content>
      </Card.Root>
    {:else}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="p-4">Date</Table.Head>
            <Table.Head class="p-4">Bénéficiaire</Table.Head>
            <Table.Head class="p-4">Motif</Table.Head>
            <Table.Head class="p-4">Catégorie</Table.Head>
            <Table.Head class="p-4">Montant</Table.Head>
            <Table.Head class="p-4">Justificatif</Table.Head>
            <Table.Head class="p-4 text-right">Statut</Table.Head>
            <Table.Head class="p-4 text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each historyExpenses as exp}
            <Table.Row class="hover:bg-muted/50 transition-colors">
              <Table.Cell class="p-4 text-muted-foreground">
                {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
              </Table.Cell>
              <Table.Cell class="p-4 font-bold text-foreground">
                {exp.emitterName}
              </Table.Cell>
              <Table.Cell class="p-4 max-w-xs truncate" title={exp.description}>
                {exp.description}
              </Table.Cell>
              <Table.Cell class="p-4">
                <Badge variant="outline" class={categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}>
                  {categoryLabels[exp.category] || exp.category}
                </Badge>
              </Table.Cell>
              <Table.Cell class="p-4 font-mono font-bold text-foreground font-semibold">
                {(exp.amount / 100).toFixed(2)} €
              </Table.Cell>
              <Table.Cell class="p-4">
                {#if exp.photoUrl}
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => selectedPhoto = exp.photoUrl}
                    class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 h-auto py-1 px-2"
                  >
                    <Eye class="w-3.5 h-3.5" />
                    Visualiser
                  </Button>
                {:else}
                  <span class="text-xs text-muted-foreground">Aucun</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="p-4 text-right">
                {#if exp.status === 'approved'}
                  <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Remboursé
                  </Badge>
                {:else}
                  <Badge variant="outline" class="bg-destructive/10 text-destructive border border-destructive/20">
                    Rejeté
                  </Badge>
                {/if}
              </Table.Cell>
              <Table.Cell class="p-4 text-right relative">
                {#if !isClosed}
                  <div class="inline-block text-left">
                    <Button 
                      variant="ghost"
                      size="icon-sm"
                      onclick={(e) => toggleDropdown(exp.id, e)} 
                      class="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" 
                      aria-label="Actions"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </Button>

                    {#if openDropdownId === exp.id}
                      <div class="absolute right-4 mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border font-medium">
                        <Button
                          variant="ghost"
                          onclick={() => handleCancelValidation(exp.id)}
                          class="w-full px-3 py-1.5 text-xs text-primary hover:bg-primary/10 font-semibold flex items-center gap-1.5 justify-start h-auto"
                        >
                          <RefreshCw class="w-3.5 h-3.5" />
                          Remettre en attente
                        </Button>
                      </div>
                    {/if}
                  </div>
                {:else}
                  <span class="text-xs text-muted-foreground italic">Aucune</span>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  {/if}
</div>

<!-- Modal Photo Viewer -->
{#if selectedPhoto}
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
    <Card.Root class="max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-card border border-border rounded-2xl p-0">
      <Card.Header class="border-b border-border px-5 py-4 flex flex-row justify-between items-center bg-muted/20 space-y-0">
        <Card.Title class="font-bold text-foreground flex items-center gap-2 text-base">
          <ImageIcon class="w-5 h-5 text-primary" />
          Justificatif de la dépense
        </Card.Title>
        <Button
          variant="ghost"
          size="icon-sm"
          onclick={() => selectedPhoto = null}
          class="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X class="w-5 h-5" />
        </Button>
      </Card.Header>
      <Card.Content class="p-6 overflow-y-auto flex items-center justify-center bg-muted/10 flex-1">
        <img src={selectedPhoto} alt="Justificatif de dépense" class="max-w-full max-h-[50vh] rounded-lg shadow-md object-contain border border-border" />
      </Card.Content>
      <Card.Footer class="border-t border-border px-5 py-3.5 flex justify-end bg-muted/20">
        <Button
          variant="outline"
          onclick={() => selectedPhoto = null}
        >
          Fermer
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
{/if}
