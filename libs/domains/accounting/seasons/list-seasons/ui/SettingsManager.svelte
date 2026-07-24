<script lang="ts">
  import { Check, Calendar, AlertCircle } from "@lucide/svelte";
  import { Card, Alert, Tabs } from "@nba/ui";
  import SeasonConfig from "./SeasonConfig.svelte";
  import CategoriesConfig from "./CategoriesConfig.svelte";
  import AccountClassesConfig from "./AccountClassesConfig.svelte";
  import type { Season, Category, AccountClass } from "./settings-types";
  import * as api from "./settings-api";

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

  let state = $state<api.SettingsState>({
    successMsg: '',
    errorMsg: '',
    isSubmitting: false
  });

  // --- SEASONS STATE ---
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

  function handleCloseSeason(id: string) {
    api.closeSeason(state, id);
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
              isSubmitting={state.isSubmitting}
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
  </Tabs.Root>
</div>
