<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import { Button, dockDePage } from "@nba/ui";
  import type { Category, AccountClass } from "./settings-types";
  import CategoryListTable from "./CategoryListTable.svelte";
  import CategoryAddForm from "./CategoryAddForm.svelte";

  let {
    categories = [],
    accountClasses = [],
    isSubmitting = false,
    onUpdateCategory,
    onDeleteCategory,
    onCreateCategory,
    tabsNav
  }: {
    categories: Category[];
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onUpdateCategory: (id: number, updates: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<boolean>;
    onDeleteCategory: (id: number) => Promise<boolean>;
    onCreateCategory: (data: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<boolean>;
    tabsNav?: any;
  } = $props();

  let showAddSheet = $state(false);
  let editingCategory = $state<Category | null>(null);

  // Fermer sans attendre effaçait la saisie même quand le serveur refusait.
  async function handleCreate(data: Parameters<typeof onCreateCategory>[0]) {
    if (await onCreateCategory(data)) showAddSheet = false;
  }

  async function handleUpdate(data: Parameters<typeof onUpdateCategory>[1]) {
    if (editingCategory) {
      if (await onUpdateCategory(editingCategory.id, data)) editingCategory = null;
    }
  }

  /*
    La création descend dans la barre du bas, comme sur tous les autres écrans : le
    bouton vivait en haut d'une barre d'outils qui défile avec la liste, donc hors de
    vue dès qu'on en parcourt le contenu — c'est-à-dire chaque fois qu'on vient y ajouter
    quelque chose.
  */
  $effect(() =>
    dockDePage.declarerActions([
      { id: 'categorie', label: 'Nouvelle catégorie', icon: Plus, run: () => (showAddSheet = true) }
    ])
  );
</script>

<div class="space-y-6">
  <CategoryListTable
    {categories}
    {accountClasses}
    {isSubmitting}
    onEditCategory={(cat) => editingCategory = cat}
    {onUpdateCategory}
    {onDeleteCategory}
    {tabsNav}
  >
    {#snippet actions()}
      <Button onclick={() => showAddSheet = true} size="sm" class="hidden md:flex font-bold items-center gap-1.5 shrink-0 self-start sm:self-auto">
        <Plus class="w-4 h-4" />
        Nouvelle catégorie
      </Button>
    {/snippet}
  </CategoryListTable>
</div>

<CategoryAddForm
  bind:open={showAddSheet}
  {accountClasses}
  {isSubmitting}
  onSubmitCategory={handleCreate}
/>

<!--
  `{#key}` n'est pas une précaution : sans lui, Svelte réemploie le composant d'une
  catégorie à l'autre. Son `open` interne étant repassé à faux à la première fermeture,
  le tiroir ne se rouvrait plus — et quand il s'ouvrait, il montrait les valeurs de la
  catégorie précédente, ses `$state` ayant été initialisés une seule fois.
-->
{#key editingCategory?.id}
  <CategoryAddForm
    open={!!editingCategory}
    onOpenChange={(o) => { if (!o) editingCategory = null; }}
    {accountClasses}
    {isSubmitting}
    initialData={editingCategory}
    onSubmitCategory={handleUpdate}
  />
{/key}
