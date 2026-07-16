<script lang="ts">
  import { Check, Calendar, Plus, Trash2, Edit2, X, AlertCircle, Settings, MoreVertical } from "lucide-svelte";

  interface Season {
    id: string;
    name: string;
    active: boolean;
    closed?: boolean;
    initialCurrentBalance?: number;
    initialSavingsBalance?: number;
    initialCashBalance?: number;
  }

  interface Category {
    id: number;
    code: string;
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses: boolean;
    receiptCode?: string | null;
    expenseCode?: string | null;
  }

  interface AccountClass {
    code: string;
    label: string;
    type: 'recette' | 'depense';
  }

  let {
    seasons = [],
    categories = [],
    accountClasses = [],
    seasonId,
    view = 'seasons'
  }: {
    seasons: Season[];
    categories: Category[];
    accountClasses?: AccountClass[];
    seasonId: string;
    view?: 'seasons' | 'compta' | 'classes';
  } = $props();

  let successMsg = $state('');
  let errorMsg = $state('');
  let isSubmitting = $state(false);

  // --- SEASONS STATE ---
  let newSeasonId = $state('');
  let newSeasonName = $state('');
  let newSeasonActive = $state(false);

  // --- CATEGORIES STATE ---
  let newCatCode = $state('');
  let newCatAdminLabel = $state('');
  let newCatAdherentLabel = $state('');
  let newCatHideInExpenses = $state(false);
  let newCatReceiptCode = $state('');
  let newCatExpenseCode = $state('');

  // Category Edit State
  let editingCatId = $state<number | null>(null);
  let editCatAdminLabel = $state('');
  let editCatAdherentLabel = $state('');
  let editCatHideInExpenses = $state(false);
  let editCatReceiptCode = $state('');
  let editCatExpenseCode = $state('');

  // --- ACCOUNT CLASSES STATE ---
  let newClassCode = $state('');
  let newClassLabel = $state('');
  let newClassType = $state<'recette' | 'depense'>('recette');

  let editingClassCode = $state<string | null>(null);
  let editClassLabel = $state('');
  let editClassType = $state<'recette' | 'depense'>('recette');

  const defaultCategoryCodes = [
    'adhesions_inscriptions', 'sponsoring', 'subventions', 'actions_jeunes', 'tournois_senior',
    'evenements_buvettes', 'cordage_vente', 'volants', 'salaires_charges', 'materiel_club',
    'licences_federation', 'championnats', 'stages_formations', 'fonctionnement_administratif'
  ];

  // Helper to show flash message
  function showMessage(success: string, error = '') {
    successMsg = success;
    errorMsg = error;
    if (success) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  // Action: Create Season
  async function handleCreateSeason(e: Event) {
    e.preventDefault();
    if (!newSeasonId.trim() || !newSeasonName.trim()) {
      errorMsg = 'Veuillez remplir tous les champs de la saison.';
      return;
    }
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_season',
          id: newSeasonId.trim(),
          name: newSeasonName.trim(),
          active: newSeasonActive
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors de la création de la saison.');
      }

      showMessage('Saison créée avec succès !');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  // Action: Toggle Season Active
  async function handleToggleSeasonActive(id: string) {
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate_season',
          id
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur de changement de saison active.');
      }

      showMessage('Saison active mise à jour !');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  // Action: Close Season
  async function handleCloseSeason(id: string) {
    if (!confirm(`Êtes-vous sûr de vouloir clôturer définitivement la saison ${id} ? Cette action est irréversible et bloquera toute modification.`)) {
      return;
    }
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_season',
          id
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur de clôture de la saison.');
      }

      showMessage('Saison clôturée avec succès !');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  // Action: Create Category
  async function handleCreateCategory(e: Event) {
    e.preventDefault();
    if (!newCatCode.trim() || !newCatAdminLabel.trim() || !newCatAdherentLabel.trim()) {
      errorMsg = 'Veuillez remplir tous les champs de la catégorie.';
      return;
    }
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_category',
          id: newCatCode.trim().toLowerCase().replace(/\s+/g, '_'), // Map code
          adminLabel: newCatAdminLabel.trim(),
          adherentLabel: newCatAdherentLabel.trim(),
          hideInExpenses: newCatHideInExpenses,
          receiptCode: newCatReceiptCode.trim() || null,
          expenseCode: newCatExpenseCode.trim() || null
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur de création de la catégorie.');
      }

      showMessage('Catégorie créée avec succès !');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  // Action: Edit Category Mode
  function startEditCategory(cat: Category) {
    editingCatId = cat.id;
    editCatAdminLabel = cat.adminLabel;
    editCatAdherentLabel = cat.adherentLabel;
    editCatHideInExpenses = cat.hideInExpenses;
    editCatReceiptCode = cat.receiptCode || '';
    editCatExpenseCode = cat.expenseCode || '';
  }

  // Action: Save Edit Category
  async function handleUpdateCategory(id: number) {
    if (!editCatAdminLabel.trim() || !editCatAdherentLabel.trim()) {
      errorMsg = 'Les libellés ne peuvent pas être vides.';
      return;
    }
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_category',
          id,
          updates: {
            adminLabel: editCatAdminLabel.trim(),
            adherentLabel: editCatAdherentLabel.trim(),
            hideInExpenses: editCatHideInExpenses,
            receiptCode: editCatReceiptCode.trim() || null,
            expenseCode: editCatExpenseCode.trim() || null
          }
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors de la modification.');
      }

      editingCatId = null;
      showMessage('Catégorie mise à jour avec succès.');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  // Action: Delete Category
  async function handleDeleteCategory(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return;
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_category',
          id
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors de la suppression.');
      }

      showMessage('Catégorie supprimée avec succès.');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  // --- ACCOUNT CLASSES ACTIONS ---
  async function handleCreateAccountClass(e: Event) {
    e.preventDefault();
    if (!newClassCode.trim() || !newClassLabel.trim()) {
      errorMsg = 'Le code et le libellé sont obligatoires.';
      return;
    }
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_account_class',
          code: newClassCode.trim(),
          label: newClassLabel.trim(),
          type: newClassType
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors de la création de la classe de compte.');
      }

      newClassCode = '';
      newClassLabel = '';
      showMessage('Classe de compte créée avec succès !');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  function startEditAccountClass(ac: AccountClass) {
    editingClassCode = ac.code;
    editClassLabel = ac.label;
    editClassType = ac.type;
  }

  async function handleUpdateAccountClass(code: string) {
    if (!editClassLabel.trim()) {
      errorMsg = 'Le libellé ne peut pas être vide.';
      return;
    }
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_account_class',
          code,
          label: editClassLabel.trim(),
          type: editClassType
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors de la modification de la classe de compte.');
      }

      editingClassCode = null;
      showMessage('Classe de compte mise à jour avec succès.');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  async function handleDeleteAccountClass(code: string) {
    if (!confirm('Voulez-vous vraiment supprimer cette classe de compte ?')) return;
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/admin/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_account_class',
          code
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors de la suppression.');
      }

      showMessage('Classe de compte supprimée avec succès.');
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

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
</script>

<div class="space-y-6">
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

  <!-- VIEW: SEASONS -->
  {#if view === 'seasons'}
    <div class="max-w-3xl bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
      <div>
        <h2 class="text-lg font-bold flex items-center gap-2">
          <Calendar class="w-5 h-5 text-primary" />
          Exercices Comptables / Saisons
        </h2>
        <p class="text-xs text-muted-foreground mt-1">
          Gérez les saisons comptables et définissez la saison active de l'association.
        </p>
      </div>

      <div class="divide-y divide-border border border-border rounded-lg overflow-hidden bg-muted/10">
        {#each seasons as s}
          <div class="p-3.5 flex justify-between items-center bg-card">
            <div>
              <span class="font-bold text-sm text-foreground">{s.name}</span>
              <span class="ml-2 text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ID: {s.id}</span>
            </div>
            <div class="flex items-center gap-3">
              {#if s.closed}
                <span class="px-2 py-0.5 bg-muted border border-border text-muted-foreground text-xs font-bold rounded-full">
                  Clôturée
                </span>
              {:else}
                {#if s.active}
                  <span class="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-full">
                    Active
                  </span>
                {:else}
                  <button
                    type="button"
                    onclick={() => handleToggleSeasonActive(s.id)}
                    disabled={isSubmitting}
                    class="px-2.5 py-1 hover:bg-muted border border-border bg-background text-xs font-semibold rounded transition-colors cursor-pointer"
                  >
                    Activer
                  </button>
                {/if}
                <button
                  type="button"
                  onclick={() => handleCloseSeason(s.id)}
                  disabled={isSubmitting}
                  class="px-2.5 py-1 text-destructive hover:bg-destructive/10 border border-destructive/20 bg-background text-xs font-semibold rounded transition-colors cursor-pointer"
                >
                  Clôturer
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Add Season Form -->
      <form onsubmit={handleCreateSeason} class="border-t border-border pt-4 space-y-4">
        <h3 class="text-sm font-bold text-foreground">Ajouter un exercice</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="new-season-id" class="block text-xs font-bold text-muted-foreground uppercase">ID (ex: 26-27)</label>
            <input
              type="text"
              id="new-season-id"
              bind:value={newSeasonId}
              placeholder="26-27"
              class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              required
            />
          </div>
          <div class="space-y-1.5">
            <label for="new-season-name" class="block text-xs font-bold text-muted-foreground uppercase">Libellé (ex: Saison 2026-2027)</label>
            <input
              type="text"
              id="new-season-name"
              bind:value={newSeasonName}
              placeholder="Saison 2026-2027"
              class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              required
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="new-season-active"
            bind:checked={newSeasonActive}
            class="rounded border-border focus:ring-primary h-4 w-4"
          />
          <label for="new-season-active" class="text-xs font-medium text-foreground">Définir comme active immédiatement</label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1"
        >
          <Plus class="w-3.5 h-3.5" />
          Créer la saison
        </button>
      </form>
    </div>
  {/if}

  <!-- VIEW: COMPTA (CATEGORIES ONLY) -->
  {#if view === 'compta'}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      <!-- Categories List Table -->
      <div class="xl:col-span-2 bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h2 class="text-lg font-bold flex items-center gap-2">
            <Settings class="w-5 h-5 text-primary" />
            Gestion des Catégories de Trésorerie
          </h2>
          <p class="text-xs text-muted-foreground mt-1">
            Configurez les libellés de comptabilité (Admin) et les libellés plus simples pour les notes de frais (Adhérent).
          </p>
        </div>

        <div class="overflow-x-auto border border-border rounded-lg bg-card min-h-[180px]">
          <table class="w-full text-left border-collapse text-sm">
            <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
              <tr>
                <th class="p-4">ID / Code</th>
                <th class="p-4">Libellé Admin (Compta)</th>
                <th class="p-4">Libellé Adhérent (Notes de Frais)</th>
                <th class="p-4">Classe Recette (CR)</th>
                <th class="p-4">Classe Dépense (CR)</th>
                <th class="p-4">Notes de frais ?</th>
                <th class="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#each categories as cat}
                <tr class="hover:bg-muted/50 transition-colors">
                  <td class="p-4">
                    <span class="font-bold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">#{cat.id}</span>
                    <span class="ml-1.5 font-mono text-xs text-muted-foreground">{cat.code}</span>
                  </td>
                  <td class="p-4">
                    {#if editingCatId === cat.id}
                      <input
                        type="text"
                        bind:value={editCatAdminLabel}
                        class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                    {:else}
                      <span class="font-semibold text-foreground">{cat.adminLabel}</span>
                    {/if}
                  </td>
                  <td class="p-4">
                    {#if editingCatId === cat.id}
                      <input
                        type="text"
                        bind:value={editCatAdherentLabel}
                        class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                    {:else}
                      <span class="text-foreground">{cat.adherentLabel}</span>
                    {/if}
                  </td>
                  <td class="p-4">
                    {#if editingCatId === cat.id}
                      <select
                        bind:value={editCatReceiptCode}
                        class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      >
                        <option value="">N/A</option>
                        {#each (accountClasses || []).filter(ac => ac.type === 'recette') as ac}
                          <option value={ac.code}>{ac.label}</option>
                        {/each}
                      </select>
                    {:else}
                      <span class="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{cat.receiptCode || 'N/A'}</span>
                    {/if}
                  </td>
                  <td class="p-4">
                    {#if editingCatId === cat.id}
                      <select
                        bind:value={editCatExpenseCode}
                        class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      >
                        <option value="">N/A</option>
                        {#each (accountClasses || []).filter(ac => ac.type === 'depense') as ac}
                          <option value={ac.code}>{ac.label}</option>
                        {/each}
                      </select>
                    {:else}
                      <span class="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{cat.expenseCode || 'N/A'}</span>
                    {/if}
                  </td>
                  <td class="p-4">
                    {#if editingCatId === cat.id}
                      <div class="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="edit-hide-{cat.id}"
                          bind:checked={editCatHideInExpenses}
                          class="rounded border-border focus:ring-primary h-3.5 w-3.5"
                        />
                        <label for="edit-hide-{cat.id}" class="text-xs text-muted-foreground">Masquer</label>
                      </div>
                    {:else}
                      {#if cat.hideInExpenses}
                        <span class="inline-flex px-2 py-0.5 bg-destructive/10 text-destructive text-[11px] font-semibold border border-destructive/20 rounded-full">
                          Masquée
                        </span>
                      {:else}
                        <span class="inline-flex px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 rounded-full">
                          Visible
                        </span>
                      {/if}
                    {/if}
                  </td>
                  <td class="p-4 text-right relative">
                    {#if editingCatId === cat.id}
                      <div class="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onclick={() => editingCatId = null}
                          class="p-1 border border-border bg-background rounded hover:bg-muted text-muted-foreground cursor-pointer"
                          title="Annuler"
                        >
                          <X class="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onclick={() => handleUpdateCategory(cat.id)}
                          disabled={isSubmitting}
                          class="p-1 bg-primary text-primary-foreground border-0 rounded hover:bg-primary/90 cursor-pointer"
                          title="Enregistrer"
                        >
                          <Check class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    {:else}
                      <div class="inline-block text-left font-normal">
                        <button 
                          type="button"
                          onclick={(e) => toggleDropdown(cat.id, e)} 
                          class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                          aria-label="Actions"
                        >
                          <MoreVertical class="w-4 h-4" />
                        </button>

                        {#if openDropdownId === cat.id}
                          <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border">
                            <button
                              type="button"
                              onclick={(e) => { e.stopPropagation(); startEditCategory(cat); openDropdownId = null; }}
                              class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                            >
                              <Edit2 class="w-3.5 h-3.5" />
                              Modifier
                            </button>
                            {#if !defaultCategoryCodes.includes(cat.code)}
                              <button
                                type="button"
                                onclick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); openDropdownId = null; }}
                                disabled={isSubmitting}
                                class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                              >
                                <Trash2 class="w-3.5 h-3.5" />
                                Supprimer
                              </button>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Category Form -->
      <div class="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h2 class="text-lg font-bold flex items-center gap-2">
            <Plus class="w-5 h-5 text-primary" />
            Nouvelle Catégorie
          </h2>
          <p class="text-xs text-muted-foreground mt-1">
            Créez une nouvelle imputation pour les dépenses et recettes de l'asso.
          </p>
        </div>

        <form onsubmit={handleCreateCategory} class="space-y-4">
          <div class="space-y-1.5">
            <label for="new-cat-code" class="block text-xs font-bold text-muted-foreground uppercase">Code ID (ex: grips)</label>
            <input
              type="text"
              id="new-cat-code"
              bind:value={newCatCode}
              placeholder="grips"
              class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label for="new-cat-admin" class="block text-xs font-bold text-muted-foreground uppercase">Libellé Admin (Compta)</label>
            <input
              type="text"
              id="new-cat-admin"
              bind:value={newCatAdminLabel}
              placeholder="Achat de grips et accessoires"
              class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label for="new-cat-adherent" class="block text-xs font-bold text-muted-foreground uppercase">Libellé Adhérent (Notes de frais)</label>
            <input
              type="text"
              id="new-cat-adherent"
              bind:value={newCatAdherentLabel}
              placeholder="Grips & Accessoires"
              class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="new-cat-recette" class="block text-xs font-bold text-muted-foreground uppercase">Classe Recette (CR)</label>
              <select
                id="new-cat-recette"
                bind:value={newCatReceiptCode}
                class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
              >
                <option value="">Aucune (N/A)</option>
                {#each (accountClasses || []).filter(ac => ac.type === 'recette') as ac}
                  <option value={ac.code}>{ac.label}</option>
                {/each}
              </select>
            </div>

            <div class="space-y-1.5">
              <label for="new-cat-depense" class="block text-xs font-bold text-muted-foreground uppercase">Classe Dépense (CR)</label>
              <select
                id="new-cat-depense"
                bind:value={newCatExpenseCode}
                class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
              >
                <option value="">Aucune (N/A)</option>
                {#each (accountClasses || []).filter(ac => ac.type === 'depense') as ac}
                  <option value={ac.code}>{ac.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="new-cat-hide"
              bind:checked={newCatHideInExpenses}
              class="rounded border-border focus:ring-primary h-4 w-4"
            />
            <label for="new-cat-hide" class="text-xs font-medium text-foreground">Masquer pour les notes de frais</label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            class="w-full justify-center px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1.5"
          >
            <Plus class="w-4 h-4" />
            Créer la catégorie
          </button>
        </form>
      </div>

    </div>
  {/if}

  <!-- VIEW: ACCOUNT CLASSES -->
  {#if view === 'classes'}
    <div class="grid gap-6 md:grid-cols-3">
      <!-- Left columns: Classes list -->
      <div class="md:col-span-2 space-y-6">
        <div class="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <h2 class="text-lg font-bold flex items-center gap-2">
              <Settings class="w-5 h-5 text-primary" />
              Gestion des Classes de Comptes
            </h2>
            <p class="text-xs text-muted-foreground mt-1">
              Configurez le Plan Comptable de l'association (Charges : classe 6, Produits : classe 7).
            </p>
          </div>

          <div class="overflow-x-auto border border-border rounded-lg bg-card min-h-[180px]">
            <table class="w-full text-left border-collapse text-sm">
              <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th class="p-4">Code</th>
                  <th class="p-4">Libellé</th>
                  <th class="p-4">Type</th>
                  <th class="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                {#each accountClasses as ac}
                  <tr class="hover:bg-muted/50 transition-colors">
                    <td class="p-4 font-mono font-bold text-foreground">
                      {ac.code}
                    </td>
                    <td class="p-4">
                      {#if editingClassCode === ac.code}
                        <input
                          type="text"
                          bind:value={editClassLabel}
                          class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      {:else}
                        <span class="font-semibold text-foreground">{ac.label}</span>
                      {/if}
                    </td>
                    <td class="p-4">
                      {#if editingClassCode === ac.code}
                        <select
                          bind:value={editClassType}
                          class="px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        >
                          <option value="recette">Produit (Recette)</option>
                          <option value="depense">Charge (Dépense)</option>
                        </select>
                      {:else}
                        {#if ac.type === 'recette'}
                          <span class="inline-flex px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 rounded-full">
                            Produit (7)
                          </span>
                        {:else}
                          <span class="inline-flex px-2 py-0.5 bg-destructive/10 text-destructive text-[11px] font-semibold border border-destructive/20 rounded-full">
                            Charge (6)
                          </span>
                        {/if}
                      {/if}
                    </td>
                    <td class="p-4 text-right relative">
                      {#if editingClassCode === ac.code}
                        <div class="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onclick={() => editingClassCode = null}
                            class="p-1 border border-border bg-background rounded hover:bg-muted text-muted-foreground cursor-pointer"
                            title="Annuler"
                          >
                            <X class="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onclick={() => handleUpdateAccountClass(ac.code)}
                            disabled={isSubmitting}
                            class="p-1 border border-primary bg-primary text-primary-foreground rounded hover:bg-primary/95 cursor-pointer"
                            title="Enregistrer"
                          >
                            <Check class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      {:else}
                        <div class="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onclick={() => startEditAccountClass(ac)}
                            class="p-1.5 border border-border bg-background rounded hover:bg-muted text-muted-foreground cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 class="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onclick={() => handleDeleteAccountClass(ac.code)}
                            disabled={isSubmitting}
                            class="p-1.5 border border-destructive/20 bg-background rounded hover:bg-destructive/10 text-destructive cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      {/if}
                    </td>
                  </tr>
                {/each}
                {#if accountClasses.length === 0}
                  <tr>
                    <td colspan="4" class="p-8 text-center text-muted-foreground">
                      Aucune classe de compte définie.
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right column: Add class form -->
      <div>
        <div class="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <h2 class="text-lg font-bold flex items-center gap-2">
              <Plus class="w-5 h-5 text-primary" />
              Nouvelle Classe
            </h2>
            <p class="text-xs text-muted-foreground mt-1">
              Ajoutez une nouvelle rubrique pour structurer le compte de résultat.
            </p>
          </div>

          <form onsubmit={handleCreateAccountClass} class="space-y-4">
            <div class="space-y-1.5">
              <label for="new-class-code" class="block text-xs font-bold text-muted-foreground uppercase">Code (ex: 63)</label>
              <input
                type="text"
                id="new-class-code"
                bind:value={newClassCode}
                placeholder="63"
                class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-mono"
                required
              />
            </div>

            <div class="space-y-1.5">
              <label for="new-class-label" class="block text-xs font-bold text-muted-foreground uppercase">Libellé (ex: 63 - Impôts)</label>
              <input
                type="text"
                id="new-class-label"
                bind:value={newClassLabel}
                placeholder="63 - Impôts et taxes"
                class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                required
              />
            </div>

            <div class="space-y-1.5">
              <label for="new-class-type" class="block text-xs font-bold text-muted-foreground uppercase">Type</label>
              <select
                id="new-class-type"
                bind:value={newClassType}
                class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
              >
                <option value="recette">Produit (7 - Recette)</option>
                <option value="depense">Charge (6 - Dépense)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              class="w-full justify-center px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1.5"
            >
              <Plus class="w-4 h-4" />
              Créer la classe
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>
