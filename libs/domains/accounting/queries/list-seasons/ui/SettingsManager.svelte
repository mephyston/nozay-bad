<script lang="ts">
  import { Check, Calendar, Plus, Trash2, Edit2, X, AlertCircle, Settings, MoreVertical } from "lucide-svelte";
  import { Button, Input, Badge, Card, Alert, Table, Tabs } from "@metacult/shared-ui";
  import SeasonConfig from "./SeasonConfig.svelte";

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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  // svelte-ignore state_referenced_locally
  let activeView = $state(view);
  
  $effect(() => {
    activeView = view;
  });

  function handleViewChange(newView: string) {
    activeView = newView as 'seasons' | 'compta' | 'classes';
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', newView);
      window.history.pushState({}, '', url);
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
    <Alert.Root class="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
      <Check class="w-4 h-4" />
      <Alert.Description>{successMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4 h-4" />
      <Alert.Description>{errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  <Tabs.Root value={activeView} onValueChange={handleViewChange} class="w-full">
    <Tabs.List class="grid grid-cols-3 max-w-md mb-6">
      <Tabs.Trigger value="seasons">Exercices & Saisons</Tabs.Trigger>
      <Tabs.Trigger value="compta">Catégories Compta</Tabs.Trigger>
      <Tabs.Trigger value="classes">Plan Comptable</Tabs.Trigger>
    </Tabs.List>

    <!-- VIEW: SEASONS -->
    <Tabs.Content value="seasons">
      {#if activeView === 'seasons'}
        <Card.Root class="max-w-3xl">
          <Card.Header>
            <Card.Title class="text-lg font-bold flex items-center gap-2">
              <Calendar class="w-5 h-5 text-primary" />
              Exercices Comptables / Saisons
            </Card.Title>
            <Card.Description>
              Gérez les saisons comptables et définissez la saison active de l'association.
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-6">
            <SeasonConfig
              {seasons}
              {isSubmitting}
              bind:newSeasonId
              bind:newSeasonName
              bind:newSeasonActive
              onCreateSeason={handleCreateSeason}
              onToggleSeasonActive={handleToggleSeasonActive}
              onCloseSeason={handleCloseSeason}
            />
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>

    <!-- VIEW: COMPTA (CATEGORIES ONLY) -->
    <Tabs.Content value="compta">
      {#if activeView === 'compta'}
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          <!-- Categories List Table -->
          <Card.Root class="xl:col-span-2">
            <Card.Header>
              <Card.Title class="text-lg font-bold flex items-center gap-2">
                <Settings class="w-5 h-5 text-primary" />
                Gestion des Catégories de Trésorerie
              </Card.Title>
              <Card.Description>
                Configurez les libellés de comptabilité (Admin) et les libellés plus simples pour les notes de frais (Adhérent).
              </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-6">
              <div class="overflow-x-auto border border-border rounded-lg bg-card min-h-[180px]">
                <Table.Root>
                  <Table.Header class="bg-muted border-b border-border">
                    <Table.Row>
                      <Table.Head class="p-4 font-medium text-muted-foreground">ID / Code</Table.Head>
                      <Table.Head class="p-4 font-medium text-muted-foreground">Libellé Admin (Compta)</Table.Head>
                      <Table.Head class="p-4 font-medium text-muted-foreground">Libellé Adhérent (Notes de Frais)</Table.Head>
                      <Table.Head class="p-4 font-medium text-muted-foreground">Classe Recette (CR)</Table.Head>
                      <Table.Head class="p-4 font-medium text-muted-foreground">Classe Dépense (CR)</Table.Head>
                      <Table.Head class="p-4 font-medium text-muted-foreground">Notes de frais ?</Table.Head>
                      <Table.Head class="p-4 text-right font-medium text-muted-foreground">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body class="divide-y divide-border">
                    {#each categories as cat}
                      <Table.Row class="hover:bg-muted/50 transition-colors">
                        <Table.Cell class="p-4">
                          <span class="font-bold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">#{cat.id}</span>
                          <span class="ml-1.5 font-mono text-xs text-muted-foreground">{cat.code}</span>
                        </Table.Cell>
                        <Table.Cell class="p-4">
                          {#if editingCatId === cat.id}
                            <Input
                              type="text"
                              bind:value={editCatAdminLabel}
                              class="h-7 text-xs font-medium"
                            />
                          {:else}
                            <span class="font-semibold text-foreground">{cat.adminLabel}</span>
                          {/if}
                        </Table.Cell>
                        <Table.Cell class="p-4">
                          {#if editingCatId === cat.id}
                            <Input
                              type="text"
                              bind:value={editCatAdherentLabel}
                              class="h-7 text-xs font-medium"
                            />
                          {:else}
                            <span class="text-foreground">{cat.adherentLabel}</span>
                          {/if}
                        </Table.Cell>
                        <Table.Cell class="p-4">
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
                        </Table.Cell>
                        <Table.Cell class="p-4">
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
                        </Table.Cell>
                        <Table.Cell class="p-4">
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
                              <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold">
                                Masquée
                              </Badge>
                            {:else}
                              <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
                                Visible
                              </Badge>
                            {/if}
                          {/if}
                        </Table.Cell>
                        <Table.Cell class="p-4 text-right relative">
                          {#if editingCatId === cat.id}
                            <div class="flex justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="icon-xs"
                                onclick={() => editingCatId = null}
                                title="Annuler"
                              >
                                <X class="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon-xs"
                                onclick={() => handleUpdateCategory(cat.id)}
                                disabled={isSubmitting}
                                title="Enregistrer"
                              >
                                <Check class="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          {:else}
                            <div class="inline-block text-left font-normal">
                              <Button 
                                variant="ghost"
                                size="icon-xs"
                                onclick={(e) => toggleDropdown(cat.id, e)} 
                                aria-label="Actions"
                              >
                                <MoreVertical class="w-4 h-4" />
                              </Button>

                              {#if openDropdownId === cat.id}
                                <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border">
                                  <Button
                                    variant="ghost"
                                    type="button"
                                    onclick={(e) => { e.stopPropagation(); startEditCategory(cat); openDropdownId = null; }}
                                    class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent justify-start h-auto rounded-none"
                                  >
                                    <Edit2 class="w-3.5 h-3.5" />
                                    Modifier
                                  </Button>
                                  {#if !defaultCategoryCodes.includes(cat.code)}
                                    <Button
                                      variant="ghost"
                                      type="button"
                                      onclick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); openDropdownId = null; }}
                                      disabled={isSubmitting}
                                      class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent justify-start h-auto rounded-none"
                                    >
                                      <Trash2 class="w-3.5 h-3.5" />
                                      Supprimer
                                    </Button>
                                  {/if}
                                </div>
                              {/if}
                            </div>
                          {/if}
                        </Table.Cell>
                      </Table.Row>
                    {/each}
                  </Table.Body>
                </Table.Root>
              </div>
            </Card.Content>
          </Card.Root>

          <!-- Add Category Form -->
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg font-bold flex items-center gap-2">
                <Plus class="w-5 h-5 text-primary" />
                Nouvelle Catégorie
              </Card.Title>
              <Card.Description>
                Créez une nouvelle imputation pour les dépenses et recettes de l'asso.
              </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-6">
              <form onsubmit={handleCreateCategory} class="space-y-4">
                <div class="space-y-1.5">
                  <label for="new-cat-code" class="block text-xs font-bold text-muted-foreground uppercase">Code ID (ex: grips)</label>
                  <Input
                    type="text"
                    id="new-cat-code"
                    bind:value={newCatCode}
                    placeholder="grips"
                    required
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="new-cat-admin" class="block text-xs font-bold text-muted-foreground uppercase">Libellé Admin (Compta)</label>
                  <Input
                    type="text"
                    id="new-cat-admin"
                    bind:value={newCatAdminLabel}
                    placeholder="Achat de grips et accessoires"
                    required
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="new-cat-adherent" class="block text-xs font-bold text-muted-foreground uppercase">Libellé Adhérent (Notes de frais)</label>
                  <Input
                    type="text"
                    id="new-cat-adherent"
                    bind:value={newCatAdherentLabel}
                    placeholder="Grips & Accessoires"
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

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  class="w-full font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus class="w-4 h-4" />
                  Créer la catégorie
                </Button>
              </form>
            </Card.Content>
          </Card.Root>

        </div>
      {/if}
    </Tabs.Content>

    <!-- VIEW: ACCOUNT CLASSES -->
    <Tabs.Content value="classes">
      {#if activeView === 'classes'}
        <div class="grid gap-6 md:grid-cols-3">
          <!-- Left columns: Classes list -->
          <div class="md:col-span-2 space-y-6">
            <Card.Root>
              <Card.Header>
                <Card.Title class="text-lg font-bold flex items-center gap-2">
                  <Settings class="w-5 h-5 text-primary" />
                  Gestion des Classes de Comptes
                </Card.Title>
                <Card.Description>
                  Configurez le Plan Comptable de l'association (Charges : classe 6, Produits : classe 7).
                </Card.Description>
              </Card.Header>
              <Card.Content class="space-y-4">
                <div class="overflow-x-auto border border-border rounded-lg bg-card min-h-[180px]">
                  <Table.Root>
                    <Table.Header class="bg-muted border-b border-border">
                      <Table.Row>
                        <Table.Head class="p-4 font-medium text-muted-foreground">Code</Table.Head>
                        <Table.Head class="p-4 font-medium text-muted-foreground">Libellé</Table.Head>
                        <Table.Head class="p-4 font-medium text-muted-foreground">Type</Table.Head>
                        <Table.Head class="p-4 text-right font-medium text-muted-foreground">Actions</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body class="divide-y divide-border">
                      {#each accountClasses as ac}
                        <Table.Row class="hover:bg-muted/50 transition-colors">
                          <Table.Cell class="p-4 font-mono font-bold text-foreground">
                            {ac.code}
                          </Table.Cell>
                          <Table.Cell class="p-4">
                            {#if editingClassCode === ac.code}
                              <Input
                                type="text"
                                bind:value={editClassLabel}
                                class="h-7 text-xs font-medium"
                              />
                            {:else}
                              <span class="font-semibold text-foreground">{ac.label}</span>
                            {/if}
                          </Table.Cell>
                          <Table.Cell class="p-4">
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
                                <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
                                  Produit (7)
                                </Badge>
                              {:else}
                                <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold">
                                  Charge (6)
                                </Badge>
                              {/if}
                            {/if}
                          </Table.Cell>
                          <Table.Cell class="p-4 text-right relative">
                            {#if editingClassCode === ac.code}
                              <div class="flex justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onclick={() => editingClassCode = null}
                                  title="Annuler"
                                >
                                  <X class="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon-xs"
                                  onclick={() => handleUpdateAccountClass(ac.code)}
                                  disabled={isSubmitting}
                                  title="Enregistrer"
                                >
                                  <Check class="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            {:else}
                              <div class="flex justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onclick={() => startEditAccountClass(ac)}
                                  title="Modifier"
                                >
                                  <Edit2 class="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  class="border-destructive/20 hover:bg-destructive/10 text-destructive"
                                  onclick={() => handleDeleteAccountClass(ac.code)}
                                  disabled={isSubmitting}
                                  title="Supprimer"
                                >
                                  <Trash2 class="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            {/if}
                          </Table.Cell>
                        </Table.Row>
                      {/each}
                      {#if accountClasses.length === 0}
                        <Table.Row>
                          <Table.Cell colspan={4} class="p-8 text-center text-muted-foreground">
                            Aucune classe de compte définie.
                          </Table.Cell>
                        </Table.Row>
                      {/if}
                    </Table.Body>
                  </Table.Root>
                </div>
              </Card.Content>
            </Card.Root>
          </div>

          <!-- Right column: Add class form -->
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg font-bold flex items-center gap-2">
                <Plus class="w-5 h-5 text-primary" />
                Nouvelle Classe
              </Card.Title>
              <Card.Description>
                Ajoutez une nouvelle rubrique pour structurer le compte de résultat.
              </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-6">
              <form onsubmit={handleCreateAccountClass} class="space-y-4">
                <div class="space-y-1.5">
                  <label for="new-class-code" class="block text-xs font-bold text-muted-foreground uppercase">Code (ex: 63)</label>
                  <Input
                    type="text"
                    id="new-class-code"
                    bind:value={newClassCode}
                    placeholder="63"
                    class="font-mono"
                    required
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="new-class-label" class="block text-xs font-bold text-muted-foreground uppercase">Libellé (ex: 63 - Impôts)</label>
                  <Input
                    type="text"
                    id="new-class-label"
                    bind:value={newClassLabel}
                    placeholder="63 - Impôts et taxes"
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

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  class="w-full font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus class="w-4 h-4" />
                  Créer la classe
                </Button>
              </form>
            </Card.Content>
          </Card.Root>
        </div>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
