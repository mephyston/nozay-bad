<script lang="ts">
  import { Calendar, AlertCircle, Plus } from "@lucide/svelte";
  import { Card, Alert, SegmentedFilter, Tabs, Button, uiAlert } from "@nba/ui";
  import SeasonConfig from "./SeasonConfig.svelte";
  import CategoriesConfig from "./CategoriesConfig.svelte";
  import AccountClassesConfig from "./AccountClassesConfig.svelte";
  import ProductCategoriesConfig from "./ProductCategoriesConfig.svelte";
  import type { Season, Category, AccountClass, ProductCategory, TreasuryAccount } from "./settings-types";
  import * as api from "./settings-api";

  let {
    seasons = [],
    categories = [],
    accountClasses = [],
    accounts = [],
    productCategories = [],
    seasonId,
    view = 'seasons',
    allowedViews = ['seasons', 'compta', 'classes', 'shop']
  }: {
    seasons: Season[];
    categories: Category[];
    accountClasses?: AccountClass[];
    accounts?: TreasuryAccount[];
    productCategories?: ProductCategory[];
    seasonId: string;
    view?: 'seasons' | 'compta' | 'classes' | 'shop';
    allowedViews?: ('seasons' | 'compta' | 'classes' | 'shop')[];
  } = $props();

  let viewState = $state<api.SettingsState>({
    errorMsg: '',
    isSubmitting: false
  });

  // Les confirmations passent par le flash de `submitForm` : elles sont rejouées après
  // le réaffichage de la liste. Seuls les échecs restent à afficher ici.
  $effect(() => {
    if (viewState.errorMsg) uiAlert(viewState.errorMsg);
  });

  // --- SEASONS STATE ---
  let showAddSeasonSheet = $state(false);
  let newSeasonId = $state('');
  let newSeasonName = $state('');
  let newSeasonActive = $state(false);

  function handleCreateSeason(e: Event) {
    e.preventDefault();
    return api.createSeason(viewState, newSeasonId, newSeasonName, newSeasonActive);
  }

  function handleToggleSeasonActive(id: string) {
    api.toggleSeasonActive(viewState, id);
  }

  function handleCloseSeason(id: string, confirmOverwrite: boolean) {
    api.closeSeason(viewState, id, confirmOverwrite);
  }

  function handleCheckCloseSeason(id: string) {
    return api.checkCloseSeason(id);
  }

  function handleCreateCategory(data: Parameters<typeof api.createCategory>[1]) {
    return api.createCategory(viewState, data);
  }

  function handleUpdateCategory(id: number, updates: Parameters<typeof api.updateCategory>[2]) {
    return api.updateCategory(viewState, id, updates);
  }

  function handleDeleteCategory(id: number) {
    return api.deleteCategory(viewState, id);
  }

  function handleCreateAccountClass(data: Parameters<typeof api.createAccountClass>[1]) {
    return api.createAccountClass(viewState, data);
  }

  function handleUpdateAccountClass(code: string, updates: Parameters<typeof api.updateAccountClass>[2]) {
    return api.updateAccountClass(viewState, code, updates);
  }

  function handleDeleteAccountClass(code: string) {
    return api.deleteAccountClass(viewState, code);
  }

  function handleCreateProductCategory(data: Parameters<typeof api.createProductCategory>[1]) {
    return api.createProductCategory(viewState, data);
  }

  function handleUpdateProductCategory(id: number, updates: Parameters<typeof api.updateProductCategory>[2]) {
    return api.updateProductCategory(viewState, id, updates);
  }

  function handleDeleteProductCategory(id: number) {
    return api.deleteProductCategory(viewState, id);
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
  {#if viewState.errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4 h-4" />
      <Alert.Description>{viewState.errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  <Tabs.Root value={activeView} onValueChange={handleViewChange} class="w-full">
    {#if allowedViews.length > 1}
      <!--
        Un contrôle segmenté, et non une barre d'onglets qui **défile horizontalement**.

        « Catégories comptables » et « Plan comptable » côte à côte dépassaient la
        largeur d'un téléphone : le dernier onglet se cachait derrière le bord, sans que
        rien ne l'annonce, et rien ne défile horizontalement dans cette application. Les
        segments se partagent la largeur et vont à la ligne s'il le faut.
      -->
      <div class="mb-6">
        <SegmentedFilter
          value={activeView}
          onChange={handleViewChange}
          options={[
            ...(allowedViews.includes('seasons') ? [{ value: 'seasons', label: 'Saisons' }] : []),
            ...(allowedViews.includes('compta') ? [{ value: 'compta', label: 'Catégories' }] : []),
            ...(allowedViews.includes('classes') ? [{ value: 'classes', label: 'Plan comptable' }] : []),
            ...(allowedViews.includes('shop') ? [{ value: 'shop', label: 'Produits' }] : [])
          ]}
        />
      </div>
    {/if}

    <!-- VIEW: SEASONS -->
    <Tabs.Content value="seasons">
      {#if activeView === 'seasons'}
        <SeasonConfig
          {seasons}
          isSubmitting={viewState.isSubmitting}
          bind:showAddSheet={showAddSeasonSheet}
          bind:newSeasonId
          bind:newSeasonName
          bind:newSeasonActive
          onCreateSeason={handleCreateSeason}
          onToggleSeasonActive={handleToggleSeasonActive}
          onCloseSeason={handleCloseSeason}
          onCheckCloseSeason={handleCheckCloseSeason}
        />
      {/if}
    </Tabs.Content>

    <!-- VIEW: COMPTA (CATEGORIES ONLY) -->
    <Tabs.Content value="compta">
      {#if activeView === 'compta'}
        <CategoriesConfig
          {categories}
          {accountClasses}
          isSubmitting={viewState.isSubmitting}
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
          {accounts}
          isSubmitting={viewState.isSubmitting}
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
          isSubmitting={viewState.isSubmitting}
          onUpdateProductCategory={handleUpdateProductCategory}
          onDeleteProductCategory={handleDeleteProductCategory}
          onCreateProductCategory={handleCreateProductCategory}
        />
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
