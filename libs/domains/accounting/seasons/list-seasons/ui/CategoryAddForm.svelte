<script lang="ts">
  import { Checkbox, SearchableCombobox, Button, Input, FormField } from '@nba/ui';
  import { Plus } from "@lucide/svelte";
  
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

  <!--
    Les deux classes l'une sous l'autre, et non côte à côte.

    Le sheet est étroit (`size="md"`) : sur une demi-largeur, un libellé comme
    « 63 - Impôts, taxes et versements assimilés » est tronqué dès le premier mot, et la liste
    déroulante — dont la largeur suit celle de son déclencheur — débordait sur le champ voisin.
    Deux listes illisibles qui se chevauchent valent moins qu'une ligne de plus à faire défiler.
  -->
  <div class="space-y-4">
      <FormField id="new-cat-recette" label="Classe Recette (CR)">
      <SearchableCombobox
        id="new-cat-recette"
        items={[{ label: 'Aucune (N/A)', value: '' }, ...(accountClasses || []).filter((ac) => ac.type === 'recette').map((ac) => ({ label: `${ac.code} - ${ac.label}`, value: ac.code }))]}
        bind:value={newCatReceiptCode}
      />
    </FormField>

      <FormField id="new-cat-depense" label="Classe Dépense (CD)">
      <SearchableCombobox
        id="new-cat-depense"
        items={[{ label: 'Aucune (N/A)', value: '' }, ...(accountClasses || []).filter((ac) => ac.type === 'depense').map((ac) => ({ label: `${ac.code} - ${ac.label}`, value: ac.code }))]}
        bind:value={newCatExpenseCode}
      />
    </FormField>
  </div>

  <FormField id="new-cat-hide" label="Masquer pour les notes de frais">
    <Checkbox id="new-cat-hide" bind:checked={newCatHideInExpenses} />
  </FormField>
  
  {#if initialData}
    <FormField id="new-cat-active" label="Catégorie active (visible en saisie)">
      <Checkbox id="new-cat-active" bind:checked={newCatActive} />
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
