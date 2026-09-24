<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import { Button, dockDePage } from "@nba/ui";
  import type { AccountClass, TreasuryAccount } from "./settings-types";
  import AccountClassListTable from "./AccountClassListTable.svelte";
  import TreasuryAccountsList from "./TreasuryAccountsList.svelte";
  import AccountClassAddForm from "./AccountClassAddForm.svelte";

  let {
    accountClasses = [],
    accounts = [],
    isSubmitting = false,
    onUpdateAccountClass,
    onDeleteAccountClass,
    onCreateAccountClass,
    tabsNav
  }: {
    accountClasses?: AccountClass[];
    /** Les comptes du club : listés ici en lecture seule, ils se règlent dans « Comptes et moyens de paiement ». */
    accounts?: TreasuryAccount[];
    isSubmitting: boolean;
    onUpdateAccountClass: (code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<boolean>;
    onDeleteAccountClass: (code: string) => Promise<boolean>;
    onCreateAccountClass: (data: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<boolean>;
    tabsNav?: any;
  } = $props();

  let showAddSheet = $state(false);
  let editingAccountClass = $state<AccountClass | null>(null);

  // Fermer sans attendre effaçait la saisie même quand le serveur refusait.
  async function handleCreate(data: Parameters<typeof onCreateAccountClass>[0]) {
    if (await onCreateAccountClass(data)) showAddSheet = false;
  }

  async function handleUpdate(data: Parameters<typeof onUpdateAccountClass>[1]) {
    if (editingAccountClass) {
      if (await onUpdateAccountClass(editingAccountClass.code, data)) editingAccountClass = null;
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
      { id: 'classe', label: 'Nouvelle classe', icon: Plus, run: () => (showAddSheet = true) }
    ])
  );
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
      <Button onclick={() => showAddSheet = true} size="sm" class="hidden md:flex font-bold items-center gap-1.5 shrink-0 self-start sm:self-auto">
        <Plus class="w-4 h-4" />
        Nouvelle classe
      </Button>
    {/snippet}
  </AccountClassListTable>

  <TreasuryAccountsList {accounts} {accountClasses} />
</div>

<AccountClassAddForm
  bind:open={showAddSheet}
  {isSubmitting}
  onSubmitAccountClass={handleCreate}
/>

<!-- Remonté à chaque classe : voir la note de `CategoriesConfig`. -->
{#key editingAccountClass?.code}
  <AccountClassAddForm
    open={!!editingAccountClass}
    onOpenChange={(o) => { if (!o) editingAccountClass = null; }}
    {isSubmitting}
    initialData={editingAccountClass}
    onSubmitAccountClass={handleUpdate}
  />
{/key}
