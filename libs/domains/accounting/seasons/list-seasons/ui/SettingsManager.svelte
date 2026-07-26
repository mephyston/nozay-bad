<script lang="ts">
  import { Check, Calendar, AlertCircle, Plus } from "@lucide/svelte";
  import { Card, Alert, Tabs, Button, toast } from "@nba/ui";
  import SeasonConfig from "./SeasonConfig.svelte";
  import CategoriesConfig from "./CategoriesConfig.svelte";
  import AccountClassesConfig from "./AccountClassesConfig.svelte";
  import ProductCategoriesConfig from "./ProductCategoriesConfig.svelte";
  import type { Season, Category, AccountClass, ProductCategory } from "./settings-types";
  import * as api from "./settings-api";

  let {
    seasons = [],
    categories = [],
    accountClasses = [],
    productCategories = [],
    seasonId,
    view = 'seasons'
  }: {
    seasons: Season[];
    categories: Category[];
    accountClasses?: AccountClass[];
    productCategories?: ProductCategory[];
    seasonId: string;
    view?: 'seasons' | 'compta' | 'classes' | 'shop';
  } = $props();

  let state = $state<api.SettingsState>({
    successMsg: '',
    errorMsg: '',
    isSubmitting: false
  });

  $effect(() => {
    if (state.successMsg) toast.success(state.successMsg);
  });

  $effect(() => {
    if (state.errorMsg) toast.error(state.errorMsg);
  });

  // --- SEASONS STATE ---
  let showAddSeasonSheet = $state(false);
  let newSeasonId = $state('');
  let newSeasonName = $state('');
  let newSeasonActive = $state(false);

  function handleCreateSeason(e: Event) {
    e.preventDefault();
    api.createSeason(state, newSeasonId, newSeasonName, newSeasonActive);
  }

  function handleToggleSeasonActive(id: string) {
    api.toggleSeasonActive(state, id);
  }

  function handleCloseSeason(id: string, confirmOverwrite: boolean) {
    api.closeSeason(state, id, confirmOverwrite);
  }

  function handleCheckCloseSeason(id: string) {
    return api.checkCloseSeason(id);
  }

  function handleCreateCategory(data: Parameters<typeof api.createCategory>[1]) {
    return api.createCategory(state, data);
  }

  function handleUpdateCategory(id: number, updates: Parameters<typeof api.updateCategory>[2]) {
    return api.updateCategory(state, id, updates);
  }

  function handleDeleteCategory(id: number) {
    return api.deleteCategory(state, id);
  }

  function handleCreateAccountClass(data: Parameters<typeof api.createAccountClass>[1]) {
    return api.createAccountClass(state, data);
  }

  function handleUpdateAccountClass(code: string, updates: Parameters<typeof api.updateAccountClass>[2]) {
    return api.updateAccountClass(state, code, updates);
  }

  function handleDeleteAccountClass(code: string) {
    return api.deleteAccountClass(state, code);
  }

  function handleCreateProductCategory(data: Parameters<typeof api.createProductCategory>[1]) {
    return api.createProductCategory(state, data);
  }

  function handleUpdateProductCategory(id: number, updates: Parameters<typeof api.updateProductCategory>[2]) {
    return api.updateProductCategory(state, id, updates);
  }

  function handleDeleteProductCategory(id: number) {
    return api.deleteProductCategory(state, id);
  }

  // svelte-ignore state_referenced_locally
  let activeView = $state(view);
  
  $effect(() => {
    activeView = view;
  });

  function handleViewChange(newView: string) {
    activeView = newView as 'seasons' | 'compta' | 'classes' | 'shop';
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', newView);
      window.history.pushState({}, '', url);
    }
  }
</script>

<div class="space-y-6">
  {#if state.successMsg}
    <Alert.Root class="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
      <Check class="w-4 h-4" />
      <Alert.Description>{state.successMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if state.errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4 h-4" />
      <Alert.Description>{state.errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  <Tabs.Root value={activeView} onValueChange={handleViewChange} class="w-full">
    <Tabs.List class="grid grid-cols-4 max-w-2xl mb-6">
      <Tabs.Trigger value="seasons">Exercices & Saisons</Tabs.Trigger>
      <Tabs.Trigger value="compta">Catégories Compta</Tabs.Trigger>
      <Tabs.Trigger value="classes">Plan Comptable</Tabs.Trigger>
      <Tabs.Trigger value="shop">Catégories Produits</Tabs.Trigger>
    </Tabs.List>

    <!-- VIEW: SEASONS -->
    <Tabs.Content value="seasons">
      {#if activeView === 'seasons'}
        <Card.Root class="w-full">
          <Card.Header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
            <div>
              <Card.Title class="text-lg font-bold flex items-center gap-2">
                <Calendar class="w-5 h-5 text-primary" />
                Exercices Comptables / Saisons
              </Card.Title>
              <Card.Description class="mt-1">
                Gérez les saisons comptables et définissez la saison active de l'association.
              </Card.Description>
            </div>
            <Button onclick={() => showAddSeasonSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
              <Plus class="w-4 h-4" />
              Nouvelle Saison
            </Button>
          </Card.Header>
          <Card.Content class="pt-6 space-y-6">
            <SeasonConfig
              {seasons}
              isSubmitting={state.isSubmitting}
              bind:showAddSheet={showAddSeasonSheet}
              bind:newSeasonId
              bind:newSeasonName
              bind:newSeasonActive
              onCreateSeason={handleCreateSeason}
              onToggleSeasonActive={handleToggleSeasonActive}
              onCloseSeason={handleCloseSeason}
              onCheckCloseSeason={handleCheckCloseSeason}
            />
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>

    <!-- VIEW: COMPTA (CATEGORIES ONLY) -->
    <Tabs.Content value="compta">
      {#if activeView === 'compta'}
        <CategoriesConfig
          {categories}
          {accountClasses}
          isSubmitting={state.isSubmitting}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onCreateCategory={handleCreateCategory}
        />
      {/if}
    </Tabs.Content>

    <!-- VIEW: ACCOUNT CLASSES -->
    <Tabs.Content value="classes">
      {#if activeView === 'classes'}
        <AccountClassesConfig
          {accountClasses}
          isSubmitting={state.isSubmitting}
          onUpdateAccountClass={handleUpdateAccountClass}
          onDeleteAccountClass={handleDeleteAccountClass}
          onCreateAccountClass={handleCreateAccountClass}
        />
      {/if}
    </Tabs.Content>

    <!-- VIEW: PRODUCT CATEGORIES -->
    <Tabs.Content value="shop">
      {#if activeView === 'shop'}
        <ProductCategoriesConfig
          {productCategories}
          {categories}
          isSubmitting={state.isSubmitting}
          onUpdateProductCategory={handleUpdateProductCategory}
          onDeleteProductCategory={handleDeleteProductCategory}
          onCreateProductCategory={handleCreateProductCategory}
        />
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
