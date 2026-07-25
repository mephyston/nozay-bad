<script lang="ts">
  import { Button, Amount, Combobox, type ComboboxItem } from '@nba/ui';
  import CreateLedgerEntrySplitRows from './CreateLedgerEntrySplitRows.svelte';

  let {
    selectedTx,
    remainingAmount = 0,
    category = $bindable('1'),
    paymentMethod = $bindable('virement'),
    selectedMemberId = $bindable(''),
    isSubmitting = false,
    handleCreateAndMatch,
    isSplitMode = $bindable(false),
    splits = $bindable([]),
    addSplitRow,
    removeSplitRow,
    categories = [],
    sortedMembers = [],
    isMemberDropdownOpen = $bindable(false),
    isCategoryDropdownOpen = $bindable(false),
    memberSearchQuery = $bindable(''),
    categorySearchQuery = $bindable('')
  }: {
    selectedTx: any;
    remainingAmount: number;
    category: string;
    paymentMethod: string;
    selectedMemberId: string;
    isSubmitting: boolean;
    handleCreateAndMatch: () => void;
    isSplitMode: boolean;
    splits: { category: string; amount: number }[];
    addSplitRow: () => void;
    removeSplitRow: (idx: number) => void;
    categories: any[];
    sortedMembers: any[];
    isMemberDropdownOpen: boolean;
    isCategoryDropdownOpen: boolean;
    memberSearchQuery: string;
    categorySearchQuery: string;
  } = $props();

  const PAYMENT_METHODS = [
    { value: 'virement', label: 'Virement bancaire' },
    { value: 'carte', label: 'Carte bancaire' },
    { value: 'cheque', label: 'Chèque' },
    { value: 'especes', label: 'Espèces' },
    { value: 'prelevement', label: 'Prélèvement' },
    { value: 'pass_sport', label: 'Pass Sport' },
    { value: 'ancv', label: 'Chèque vacances (ANCV)' },
    { value: 'labaz', label: 'LABAZ' },
    { value: 'ticket_loisir', label: 'Ticket Loisir' },
    { value: 'up_loisir', label: 'Up Loisir' }
  ];

  let categoryItems = $derived<ComboboxItem[]>(
    categories.map(c => ({
      value: String(c.id),
      label: c.name || c.adminLabel || ''
    }))
  );

  let memberItems = $derived<ComboboxItem[]>(
    sortedMembers.map(m => ({
      value: String(m.id),
      label: `${m.lastName} ${m.firstName}`,
      detail: m.licence
    }))
  );

  let splitSum = $derived(splits.reduce((sum, s) => sum + Math.round((s.amount || 0) * 100), 0));
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <h4 class="text-sm font-semibold text-foreground">Créer et rapprocher une nouvelle écriture</h4>
    <Button
      variant="outline"
      size="xs"
      onclick={() => {
        isSplitMode = !isSplitMode;
        if (isSplitMode && splits.length === 0) {
          splits = [{ category: '1', amount: 0 }, { category: '1', amount: 0 }];
        }
      }}
    >
      {isSplitMode ? 'Annuler la ventilation' : 'Ventiler'}
    </Button>
  </div>

  {#if !isSplitMode}
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Combobox
          id="category-search-input"
          label="Catégorie Comptable"
          placeholder="Rechercher une catégorie..."
          bind:value={category}
          items={categoryItems}
          allowClear={false}
        />
      </div>

      <div>
        <Combobox
          id="payment-method-search-input"
          label="Mode de règlement"
          placeholder="Rechercher un mode..."
          bind:value={paymentMethod}
          items={PAYMENT_METHODS}
          allowClear={false}
        />
      </div>
    </div>

    <div>
      <Combobox
        id="member-search-input"
        label="Adhérent Associé (Optionnel)"
        placeholder="Tapez pour rechercher un adhérent..."
        bind:value={selectedMemberId}
        items={memberItems}
        allowClear={true}
        clearLabel="Aucun adhérent (Écriture générale)"
      />
    </div>
  {:else}
    <CreateLedgerEntrySplitRows
      bind:splits
      {remainingAmount}
      {splitSum}
      {categories}
      {addSplitRow}
      {removeSplitRow}
    />
  {/if}

  <div class="pt-2">
    <Button 
      onclick={handleCreateAndMatch}
      disabled={isSubmitting || (isSplitMode && splitSum !== remainingAmount)}
      class="w-full font-bold"
    >
      {#if isSplitMode}
        Enregistrer la ventilation
      {:else}
        <span class="flex items-center justify-center gap-1.5">
          <span>Créer et rapprocher</span>
          <Amount cents={remainingAmount} />
        </span>
      {/if}
    </Button>
  </div>
</div>
