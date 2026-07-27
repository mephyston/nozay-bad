<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import { Button, Input } from "@nba/ui";
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
  <div class="space-y-1.5">
    <label for="new-cat-admin" class="block text-xs font-bold text-muted-foreground uppercase">Libellé Admin (Compta)</label>
    <Input
      type="text"
      id="new-cat-admin"
      bind:value={newCatAdminLabel}
      placeholder="Achat de grips et accessoires"
      required
    />
  </div>

  <div class="space-y-1.5">
    <label for="new-cat-adherent" class="block text-xs font-bold text-muted-foreground uppercase">Libellé Adhérent (Notes de frais)</label>
    <Input
      type="text"
      id="new-cat-adherent"
      bind:value={newCatAdherentLabel}
      placeholder="Grips & Accessoires"
      required
    />
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div class="space-y-1.5">
      <label for="new-cat-recette" class="block text-xs font-bold text-muted-foreground uppercase">Classe Recette (CR)</label>
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
    </div>

    <div class="space-y-1.5">
      <label for="new-cat-depense" class="block text-xs font-bold text-muted-foreground uppercase">Classe Dépense (CD)</label>
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
    </div>
  </div>

  <div class="flex items-center gap-2 pt-2">
    <input
      type="checkbox"
      id="new-cat-hide"
      bind:checked={newCatHideInExpenses}
      class="rounded border-border focus:ring-primary h-4 w-4"
    />
    <label for="new-cat-hide" class="text-xs font-medium text-foreground">Masquer pour les notes de frais</label>
  </div>
  
  {#if initialData}
    <div class="flex items-center gap-2 pt-1 pb-2">
      <input
        type="checkbox"
        id="new-cat-active"
        bind:checked={newCatActive}
        class="rounded border-border focus:ring-primary h-4 w-4"
      />
      <label for="new-cat-active" class="text-xs font-medium text-foreground">Catégorie active (visible en saisie)</label>
    </div>
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
