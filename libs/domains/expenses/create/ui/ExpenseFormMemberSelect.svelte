<script lang="ts">
  import { Search, ChevronDown } from '@lucide/svelte';
  import { Input, Label, Badge } from '@nba/ui';
  import type { Member } from './expense-form-types';
  import { formatMemberName, formatLicence } from './expense-form-utils';

  let {
    selectedMemberId = $bindable(''),
    memberSearchQuery = $bindable(''),
    isMemberDropdownOpen = $bindable(false),
    highlightedIndex = $bindable(-1),
    selectedMember,
    memberDisplayVal,
    filteredMembers,
    onSelectMember,
    onKeyDown
  }: {
    selectedMemberId: string;
    memberSearchQuery: string;
    isMemberDropdownOpen: boolean;
    highlightedIndex: number;
    selectedMember: Member | null;
    memberDisplayVal: string;
    filteredMembers: Member[];
    onSelectMember: (m: Member) => void;
    onKeyDown: (e: KeyboardEvent) => void;
  } = $props();
</script>

<div class="space-y-1.5 relative">
  <Label for="expense-member-input" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Demandeur (Adhérent)</Label>
  <div class="relative">
    <Search class="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground z-10" />
    <Input
      id="expense-member-input"
      type="text"
      role="combobox"
      autocomplete="off"
      aria-expanded={isMemberDropdownOpen}
      aria-autocomplete="list"
      aria-controls="expense-member-listbox"
      aria-activedescendant={highlightedIndex >= 0 ? `expense-member-option-${highlightedIndex}` : undefined}
      placeholder="Rechercher par Nom, Prénom, ou N° Licence (min 3 caractères)..."
      class="w-full pl-10 pr-10 h-10 rounded-xl font-semibold"
      value={isMemberDropdownOpen ? memberSearchQuery : memberDisplayVal}
      oninput={(e) => {
        isMemberDropdownOpen = true;
        memberSearchQuery = (e.target as HTMLInputElement).value;
      }}
      onfocus={(e) => {
        isMemberDropdownOpen = true;
        if (selectedMember) {
          memberSearchQuery = formatMemberName(selectedMember);
        } else {
          memberSearchQuery = '';
        }
        (e.target as HTMLInputElement).select();
      }}
      onblur={() => {
        setTimeout(() => { isMemberDropdownOpen = false; }, 200);
      }}
      onkeydown={onKeyDown}
      required
    />
    <ChevronDown class="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
  </div>

  {#if isMemberDropdownOpen}
    <div
      role="listbox"
      id="expense-member-listbox"
      class="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl divide-y divide-border"
    >
      {#each filteredMembers as m, index}
        <button
          type="button"
          role="option"
          aria-selected={selectedMemberId === m.id.toString()}
          id={`expense-member-option-${index}`}
          class="w-full text-left px-4 py-2.5 text-sm transition-colors font-semibold border-0 cursor-pointer {index === highlightedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}"
          onmousedown={() => {
            onSelectMember(m);
          }}
        >
          <div class="flex justify-between items-center">
            <span>{formatMemberName(m)}</span>
            <Badge variant="outline" class="font-mono">Licence: {formatLicence(m.licence)}</Badge>
          </div>
        </button>
      {:else}
        <div class="px-4 py-3 text-sm text-muted-foreground italic bg-popover">
          {memberSearchQuery.trim().length > 0 && memberSearchQuery.trim().length < 3 ? 'Saisissez au moins 3 caractères pour rechercher' : 'Aucun adhérent trouvé'}
        </div>
      {/each}
    </div>
  {/if}
</div>
