<script lang="ts">
  import { SwitchField, SearchableCombobox, Input, FormField, FormSheet } from '@nba/ui';
  import { Plus, Settings } from "@lucide/svelte";

  import type { AccountClass } from "./settings-types";

  /**
   * Créer ou modifier une catégorie comptable, **en tiroir**.
   *
   * Le formulaire portait son propre bouton en bas de ses champs, dans une
   * `Sheet` montée par l'écran. Sur téléphone, ce bouton passait sous le pli dès que
   * le clavier logiciel s'ouvrait. `FormSheet` le remonte dans la barre de la feuille,
   * et fait monter celle-ci du bas — la grammaire de tous les autres formulaires.
   */
  let {
    open = $bindable(false),
    accountClasses = [],
    isSubmitting = false,
    initialData = null,
    onSubmitCategory,
    onOpenChange
  }: {
    open?: boolean;
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
    /** Prévenu de chaque fermeture : c'est lui qui remet à zéro la catégorie modifiée. */
    onOpenChange?: (open: boolean) => void;
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

<FormSheet
  bind:open
  title={initialData ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
  description={initialData
    ? 'Mettez à jour les libellés ou les classes comptables par défaut.'
    : "Créez une nouvelle imputation pour les dépenses et recettes de l'asso."}
  icon={initialData ? Settings : Plus}
  {isSubmitting}
  submitLabel={initialData ? 'Enregistrer les modifications' : 'Créer la catégorie'}
  onSubmit={handleSubmit}
  {onOpenChange}
>
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

    Le tiroir est étroit (`size="md"`) : sur une demi-largeur, un libellé comme
    « 63 - Impôts, taxes et versements assimilés » est tronqué dès le premier mot, et la liste
    déroulante — dont la largeur suit celle de son déclencheur — débordait sur le champ voisin.
    Deux listes illisibles qui se chevauchent valent moins qu'une ligne de plus à faire défiler.
  -->
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

  <!--
    Deux réglages, donc deux interrupteurs : une case à cocher répond à « lequel ? »,
    un interrupteur à « est-ce actif ? ». Ils portent leur intitulé à gauche, et
    `FormField` l'absorbe pour ne pas l'écrire deux fois.
  -->
  <FormField id="new-cat-hide" label="Masquer pour les notes de frais">
    <SwitchField
      id="new-cat-hide"
      label="Masquer pour les notes de frais"
      bind:checked={newCatHideInExpenses}
    />
  </FormField>

  {#if initialData}
    <FormField id="new-cat-active" label="Catégorie active (visible en saisie)">
      <SwitchField
        id="new-cat-active"
        label="Catégorie active (visible en saisie)"
        bind:checked={newCatActive}
      />
    </FormField>
  {/if}
</FormSheet>
