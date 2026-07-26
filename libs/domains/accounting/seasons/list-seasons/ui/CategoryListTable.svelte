<script lang="ts">
  import { Table } from "@nba/ui";
  import type { Category, AccountClass } from "./settings-types";
  import CategoryRow from "./CategoryRow.svelte";

  let {
    categories = [],
    accountClasses = [],
    isSubmitting = false,
    onUpdateCategory,
    onDeleteCategory
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
    }) => Promise<void>;
    onDeleteCategory: (id: number) => Promise<void>;
  } = $props();

  const sortedCategories = $derived(
    [...categories].sort((a, b) => (a.adminLabel || '').localeCompare(b.adminLabel || '', 'fr', { sensitivity: 'base' }))
  );

  let editingCatId = $state<number | null>(null);
</script>

<div class="overflow-x-auto border border-border rounded-lg bg-card min-h-[180px]">
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head>Libellé Admin (Compta)</Table.Head>
        <Table.Head>Libellé Adhérent (Notes de Frais)</Table.Head>
        <Table.Head>Classe Recette (CR)</Table.Head>
        <Table.Head>Classe Dépense (CD)</Table.Head>
        <Table.Head>Notes de frais ?</Table.Head>
        <Table.Head class="text-right">Actions</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each sortedCategories as cat}
        <CategoryRow
          {cat}
          {accountClasses}
          {isSubmitting}
          bind:editingCatId
          {onUpdateCategory}
          {onDeleteCategory}
        />
      {/each}
    </Table.Body>
  </Table.Root>
</div>
