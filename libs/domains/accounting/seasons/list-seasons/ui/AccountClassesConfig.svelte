<script lang="ts">
  import { Settings, Plus } from "@lucide/svelte";
  import { Card } from "@nba/ui";
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
    onUpdateAccountClass: (code: string, updates: { label: string; type: 'recette' | 'depense' }) => Promise<void>;
    onDeleteAccountClass: (code: string) => Promise<void>;
    onCreateAccountClass: (data: { code: string; label: string; type: 'recette' | 'depense' }) => Promise<void>;
  } = $props();
</script>

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
        <AccountClassListTable
          {accountClasses}
          {isSubmitting}
          {onUpdateAccountClass}
          {onDeleteAccountClass}
        />
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
      <AccountClassAddForm
        {isSubmitting}
        {onCreateAccountClass}
      />
    </Card.Content>
  </Card.Root>
</div>
