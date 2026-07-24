<script lang="ts">
  import { Button, Input } from '@nba/ui';
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
    categorySearchQuery.trim() === '' ? categories : categories.filter(c => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
  );

  let splitSum = $derived(splits.reduce((sum, s) => sum + Math.round((s.amount || 0) * 100), 0));
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <h4 class="text-sm font-semibold text-gray-700">Créer et rapprocher une nouvelle écriture</h4>
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
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Catégorie Comptable</label>
        <div class="relative">
          <button
            type="button"
            onclick={() => isCategoryDropdownOpen = !isCategoryDropdownOpen}
            class="w-full flex justify-between items-center bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span class="truncate">{categories.find(c => c.id === category)?.name || 'Choisir une catégorie...'}</span>
            <span class="text-gray-400">▼</span>
          </button>

          {#if isCategoryDropdownOpen}
            <div class="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-2">
              <Input placeholder="Rechercher une catégorie..." bind:value={categorySearchQuery} size="sm" />
              <div class="space-y-0.5">
                {#each filteredCategories as cat}
                  <button
                    type="button"
                    onclick={() => { category = cat.id; isCategoryDropdownOpen = false; }}
                    class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-xs truncate"
                  >
                    {cat.name}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mode de règlement</label>
        <select bind:value={paymentMethod} class="w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="virement">Virement bancaire</option>
          <option value="cheque">Chèque</option>
          <option value="especes">Espèces</option>
          <option value="labaz">Règlement Labaz</option>
          <option value="ancv">Chèque vacances ANCV</option>
          <option value="pass_sport">Pass'Sport</option>
          <option value="ticket_loisir">Ticket loisir CAF</option>
          <option value="up_loisir">Chèque Up Sport & Loisirs</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Associer à un adhérent</label>
      <div class="relative">
        <button
          type="button"
          onclick={() => isMemberDropdownOpen = !isMemberDropdownOpen}
          class="w-full flex justify-between items-center bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span>
            {#if selectedMemberId}
              {sortedMembers.find(m => String(m.id) === selectedMemberId)?.lastName || ''} {sortedMembers.find(m => String(m.id) === selectedMemberId)?.firstName || ''}
            {:else}
              Choisir un adhérent...
            {/if}
          </span>
          <span class="text-gray-400">▼</span>
        </button>

        <div class="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-2" class:hidden={!isMemberDropdownOpen}>
          <Input placeholder="Tapez pour rechercher un adhérent..." bind:value={memberSearchQuery} size="sm" />
          <div class="space-y-0.5">
            <button
              type="button"
              onclick={() => { selectedMemberId = ''; isMemberDropdownOpen = false; }}
              class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-xs text-red-600 font-medium"
            >
              Aucun lien adhérent
            </button>
            {#each filteredMembers as m}
              <button
                type="button"
                onclick={() => { selectedMemberId = String(m.id); isMemberDropdownOpen = false; }}
                class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-xs flex justify-between"
              >
                <span>{m.lastName} {m.firstName}</span>
                <span class="text-gray-400">{m.licence}</span>
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
      class="w-full"
    >
      {isSplitMode ? 'Enregistrer la ventilation' : `Créer et rapprocher ${(remainingAmount / 100).toFixed(2)} €`}
    </Button>
  </div>
</div>
