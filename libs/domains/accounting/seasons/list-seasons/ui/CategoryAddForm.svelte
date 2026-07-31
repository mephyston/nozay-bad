<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import { Button, Input, FormField } from"@nba/ui";
  import type { AccountClass } from "./settings-types";

  let {
    accountClasses = [],
    isSubmitting = false,
    initialData = null,
    onSubmitCategory
  }: {
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    initialData?: any;
    onSubmitCategory: (data: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
      active: boolean;
    }) => Promise<void>;
  } = $props();

  let newCatAdminLabel = $state(initialData?.adminLabel || '');
  let newCatAdherentLabel = $state(initialData?.adherentLabel || '');
  let newCatHideInExpenses = $state(initialData?.hideInExpenses || false);
  
  // For initial data, we try to use receiptCode, fallback to finding the code by account class ID
  let defaultReceiptCode = initialData?.receiptCode || '';
  if (!defaultReceiptCode && initialData?.receiptAccountClassId && accountClasses) {
    defaultReceiptCode = accountClasses.find(ac => ac.id === initialData.receiptAccountClassId)?.code || '';
  }
  let newCatReceiptCode = $state(defaultReceiptCode);

  let defaultExpenseCode = initialData?.expenseCode || '';
  if (!defaultExpenseCode && initialData?.expenseAccountClassId && accountClasses) {
    defaultExpenseCode = accountClasses.find(ac => ac.id === initialData.expenseAccountClassId)?.code || '';
  }
  let newCatExpenseCode = $state(defaultExpenseCode);
  
  let newCatActive = $state(initialData?.active ?? true);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    await onSubmitCategory({
      adminLabel: newCatAdminLabel.trim(),
      adherentLabel: newCatAdherentLabel.trim(),
      hideInExpenses: newCatHideInExpenses,
      receiptCode: newCatReceiptCode.trim() || null,
      expenseCode: newCatExpenseCode.trim() || null,
      active: newCatActive
    });
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
    <FormField id="new-cat-admin" label="Libellé Admin (Compta)">
    <Input
      type="text"
      id="new-cat-admin"
      bind:value={newCatAdminLabel}
      placeholder="Achat de grips et accessoires"
      required
    />
  </FormField>

    <FormField id="new-cat-adherent" label="Libellé Adhérent (Notes de frais)">
    <Input
      type="text"
      id="new-cat-adherent"
      bind:value={newCatAdherentLabel}
      placeholder="Grips & Accessoires"
      required
    />
  </FormField>

  <div class="grid grid-cols-2 gap-4">
      <FormField id="new-cat-recette" label="Classe Recette (CR)">
      <select
        id="new-cat-recette"
        bind:value={newCatReceiptCode}
        class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
      >
        <option value="">Aucune (N/A)</option>
        {#each (accountClasses || []).filter(ac => ac.type === 'recette') as ac}
          <option value={ac.code}>{ac.code} - {ac.label}</option>
        {/each}
      </select>
    </FormField>

      <FormField id="new-cat-depense" label="Classe Dépense (CD)">
      <select
        id="new-cat-depense"
        bind:value={newCatExpenseCode}
        class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
      >
        <option value="">Aucune (N/A)</option>
        {#each (accountClasses || []).filter(ac => ac.type === 'depense') as ac}
          <option value={ac.code}>{ac.code} - {ac.label}</option>
        {/each}
      </select>
    </FormField>
  </div>

  <FormField id="new-cat-hide" label="Masquer pour les notes de frais">
    <input
      type="checkbox"
      id="new-cat-hide"
      bind:checked={newCatHideInExpenses}
      class="rounded border-border focus:ring-primary h-4 w-4"
    />
  </FormField>
  
  {#if initialData}
    <FormField id="new-cat-active" label="Catégorie active (visible en saisie)">
      <input
        type="checkbox"
        id="new-cat-active"
        bind:checked={newCatActive}
        class="rounded border-border focus:ring-primary h-4 w-4"
      />
    </FormField>
  {/if}

  <Button
    type="submit"
    disabled={isSubmitting}
    class="w-full font-bold flex items-center justify-center gap-1.5"
  >
    {#if initialData}
      Enregistrer les modifications
    {:else}
      <Plus class="w-4 h-4" />
      Créer la catégorie
    {/if}
  </Button>
</form>
