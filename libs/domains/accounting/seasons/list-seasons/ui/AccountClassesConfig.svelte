<script lang="ts">
  import { Settings, Plus } from "@lucide/svelte";
  import { Card, Button, Sheet } from "@nba/ui";
  import type { AccountClass } from "./settings-types";
  import AccountClassListTable from "./AccountClassListTable.svelte";
  import AccountClassAddForm from "./AccountClassAddForm.svelte";

  let {
    accountClasses = [],
    isSubmitting = false,
    onUpdateAccountClass,
    onDeleteAccountClass,
    onCreateAccountClass,
    tabsNav
  }: {
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onUpdateAccountClass: (code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
    onDeleteAccountClass: (code: string) => Promise<void>;
    onCreateAccountClass: (data: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
    tabsNav?: any;
  } = $props();

  let showAddSheet = $state(false);
  let editingAccountClass = $state<AccountClass | null>(null);

  async function handleCreate(data: Parameters<typeof onCreateAccountClass>[0]) {
    await onCreateAccountClass(data);
    showAddSheet = false;
  }

  async function handleUpdate(data: Parameters<typeof onUpdateAccountClass>[1]) {
    if (editingAccountClass) {
      await onUpdateAccountClass(editingAccountClass.code, data);
      editingAccountClass = null;
    }
  }
</script>

<div class="space-y-6">
  <AccountClassListTable
    {accountClasses}
    {isSubmitting}
    onEditAccountClass={(ac) => editingAccountClass = ac}
    {onUpdateAccountClass}
    {onDeleteAccountClass}
    {tabsNav}
  >
    {#snippet actions()}
      <Button onclick={() => showAddSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
        <Plus class="w-4 h-4" />
        Nouvelle classe
      </Button>
    {/snippet}
  </AccountClassListTable>
</div>

<Sheet.Root bind:open={showAddSheet}>
  <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Plus class="w-5 h-5 text-primary" />
        Nouvelle classe
      </Sheet.Title>
      <Sheet.Description>
        Ajoutez une nouvelle rubrique pour structurer le compte de résultat.
      </Sheet.Description>
    </Sheet.Header>
    <div class="pt-4">
      <AccountClassAddForm
        {isSubmitting}
        onCreateAccountClass={handleCreate}
      />
    </div>
  </Sheet.Content>
</Sheet.Root>

<Sheet.Root open={!!editingAccountClass} onOpenChange={(o) => { if (!o) editingAccountClass = null; }}>
  <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Settings class="w-5 h-5 text-primary" />
        Modifier la classe
      </Sheet.Title>
      <Sheet.Description>
        Modifiez le libellé ou le type de cette classe de compte.
      </Sheet.Description>
    </Sheet.Header>
    <div class="pt-4">
      {#if editingAccountClass}
        <AccountClassAddForm
          {isSubmitting}
          initialData={editingAccountClass}
          onSubmitAccountClass={handleUpdate}
        />
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
