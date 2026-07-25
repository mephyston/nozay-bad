<script lang="ts">
  import { Button, Input, Amount } from '@nba/ui';
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

  let filteredMembers = $derived(
    memberSearchQuery.trim() === '' ? sortedMembers : sortedMembers.filter(m => `${m.firstName} ${m.lastName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  let filteredCategories = $derived(
    categorySearchQuery.trim() === '' ? categories : categories.filter(c => (c.name || c.adminLabel || '').toLowerCase().includes(categorySearchQuery.toLowerCase()))
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
        <span class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Catégorie Comptable</span>
        <div class="relative">
          <button
            type="button"
            onclick={() => isCategoryDropdownOpen = !isCategoryDropdownOpen}
            class="w-full flex justify-between items-center bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span class="truncate">{categories.find(c => String(c.id) === String(category))?.name || categories.find(c => String(c.id) === String(category))?.adminLabel || 'Choisir une catégorie...'}</span>
            <span class="text-muted-foreground">▼</span>
          </button>

          {#if isCategoryDropdownOpen}
            <div class="absolute z-50 w-full mt-1 bg-popover border border-border text-popover-foreground rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-2">
              <Input placeholder="Rechercher une catégorie..." bind:value={categorySearchQuery} size="sm" />
              <div class="space-y-0.5">
                {#each filteredCategories as cat}
                  <button
                    type="button"
                    onclick={() => { category = String(cat.id); isCategoryDropdownOpen = false; }}
                    class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs truncate text-foreground"
                  >
                    {cat.name || cat.adminLabel}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div>
        <label for="payment-method-select" class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Mode de règlement</label>
        <select
          id="payment-method-select"
          bind:value={paymentMethod}
          class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
        >
          <option value="virement">Virement bancaire</option>
          <option value="carte">Carte bancaire</option>
          <option value="cheque">Chèque</option>
          <option value="especes">Espèces</option>
          <option value="prelevement">Prélèvement</option>
        </select>
      </div>
    </div>

    <div>
      <span class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Adhérent Associé (Optionnel)</span>
      <div class="relative">
        <button
          type="button"
          onclick={() => isMemberDropdownOpen = !isMemberDropdownOpen}
          class="w-full flex justify-between items-center bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span class="truncate">
            {#if selectedMemberId}
              {sortedMembers.find(m => String(m.id) === String(selectedMemberId))?.lastName} {sortedMembers.find(m => String(m.id) === String(selectedMemberId))?.firstName}
            {:else}
              Aucun adhérent (Écriture générale)
            {/if}
          </span>
          <span class="text-muted-foreground">▼</span>
        </button>

        <div class="absolute z-50 w-full mt-1 bg-popover border border-border text-popover-foreground rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-2" class:hidden={!isMemberDropdownOpen}>
          <Input placeholder="Tapez pour rechercher un adhérent..." bind:value={memberSearchQuery} onfocus={() => isMemberDropdownOpen = true} size="sm" />
          <div class="space-y-0.5">
            <button
              type="button"
              onclick={() => { selectedMemberId = ''; isMemberDropdownOpen = false; }}
              class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs text-muted-foreground font-medium"
            >
              Aucun adhérent (Écriture générale)
            </button>
            {#each filteredMembers as member}
              <button
                type="button"
                onclick={() => { selectedMemberId = String(member.id); isMemberDropdownOpen = false; }}
                class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs truncate flex justify-between items-center text-foreground"
              >
                <span>{member.lastName} {member.firstName}</span>
                <span class="text-[10px] text-muted-foreground font-mono">{member.licence}</span>
              </button>
            {/each}
          </div>
        </div>
      </div>
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
