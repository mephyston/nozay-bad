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

  function normalizeString(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  let selectedMember = $derived(sortedMembers.find(m => String(m.id) === String(selectedMemberId)));

  let filteredMembers = $derived.by(() => {
    const q = normalizeString(memberSearchQuery.trim());
    if (!q) return sortedMembers;
    return sortedMembers.filter(m => {
      const lastFirst = normalizeString(`${m.lastName || ''} ${m.firstName || ''} ${m.licence || ''}`);
      const firstLast = normalizeString(`${m.firstName || ''} ${m.lastName || ''} ${m.licence || ''}`);
      return lastFirst.includes(q) || firstLast.includes(q);
    });
  });

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
            class="w-full flex justify-between items-center bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
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
                    class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs truncate text-foreground cursor-pointer"
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
      <label for="member-search-input" class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        Adhérent Associé (Optionnel)
      </label>
      <div class="relative">
        <div class="relative flex items-center">
          <input
            id="member-search-input"
            type="text"
            placeholder="Tapez pour rechercher un adhérent..."
            value={isMemberDropdownOpen ? memberSearchQuery : (selectedMember ? `${selectedMember.lastName} ${selectedMember.firstName}` : '')}
            oninput={(e) => {
              memberSearchQuery = (e.target as HTMLInputElement).value;
              isMemberDropdownOpen = true;
            }}
            onfocus={() => {
              isMemberDropdownOpen = true;
              memberSearchQuery = '';
            }}
            class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-8 cursor-pointer"
          />
          {#if selectedMemberId}
            <button
              type="button"
              onclick={() => {
                selectedMemberId = '';
                memberSearchQuery = '';
                isMemberDropdownOpen = false;
              }}
              class="absolute right-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-1"
              title="Effacer l'adhérent"
            >
              ✕
            </button>
          {:else}
            <span class="absolute right-3 text-xs text-muted-foreground pointer-events-none">▼</span>
          {/if}
        </div>

        {#if isMemberDropdownOpen}
          <div class="absolute z-50 w-full mt-1 bg-popover border border-border text-popover-foreground rounded-lg shadow-lg max-h-60 overflow-y-auto p-1 space-y-0.5">
            <button
              type="button"
              onclick={() => {
                selectedMemberId = '';
                memberSearchQuery = '';
                isMemberDropdownOpen = false;
              }}
              class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs text-muted-foreground font-medium cursor-pointer"
            >
              Aucun adhérent (Écriture générale)
            </button>
            {#if filteredMembers.length === 0}
              <div class="px-2 py-2 text-xs text-muted-foreground italic text-center">
                Aucun adhérent trouvé
              </div>
            {:else}
              {#each filteredMembers as member}
                <button
                  type="button"
                  onclick={() => {
                    selectedMemberId = String(member.id);
                    memberSearchQuery = `${member.lastName} ${member.firstName}`;
                    isMemberDropdownOpen = false;
                  }}
                  class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs truncate flex justify-between items-center text-foreground cursor-pointer"
                >
                  <span>{member.lastName} {member.firstName}</span>
                  <span class="text-[10px] text-muted-foreground font-mono">{member.licence}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
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
