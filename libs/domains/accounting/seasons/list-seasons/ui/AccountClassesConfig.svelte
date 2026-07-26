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
    onCreateAccountClass
  }: {
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onUpdateAccountClass: (code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
    onDeleteAccountClass: (code: string) => Promise<void>;
    onCreateAccountClass: (data: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
  } = $props();

  let showAddSheet = $state(false);

  async function handleCreate(data: Parameters<typeof onCreateAccountClass>[0]) {
    await onCreateAccountClass(data);
    showAddSheet = false;
  }
</script>

<Card.Root class="w-full">
  <Card.Header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
    <div>
      <Card.Title class="text-lg font-bold flex items-center gap-2">
        <Settings class="w-5 h-5 text-primary" />
        Gestion des Classes de Comptes
      </Card.Title>
      <Card.Description class="mt-1">
        Configurez le Plan Comptable de l'association (Charges : classe 6, Produits : classe 7).
      </Card.Description>
    </div>
    <Button onclick={() => showAddSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
      <Plus class="w-4 h-4" />
      Nouvelle Classe
    </Button>
  </Card.Header>
  <Card.Content class="pt-6 space-y-4">
    <AccountClassListTable
      {accountClasses}
      {isSubmitting}
      {onUpdateAccountClass}
      {onDeleteAccountClass}
    />
  </Card.Content>
</Card.Root>

<Sheet.Root bind:open={showAddSheet}>
  <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Plus class="w-5 h-5 text-primary" />
        Nouvelle Classe
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
