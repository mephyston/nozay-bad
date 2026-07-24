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

  let editingCatId = $state<number | null>(null);
  let openDropdownId = $state<number | null>(null);

  $effect(() => {
    const handleGlobalClick = () => { openDropdownId = null; };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });
</script>

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
        <CategoryRow
          {cat}
          {accountClasses}
          {isSubmitting}
          bind:editingCatId
          bind:openDropdownId
          {onUpdateCategory}
          {onDeleteCategory}
        />
      {/each}
    </Table.Body>
  </Table.Root>
</div>
