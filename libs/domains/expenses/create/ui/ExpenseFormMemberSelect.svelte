<script lang="ts">
  import { Search, ChevronDown } from '@lucide/svelte';
  import { Input, Label, Badge, SearchableCombobox } from '@nba/ui';
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

  $effect(() => {
    if (selectedMemberId) {
      const member = filteredMembers.find(m => m.id.toString() === selectedMemberId);
      if (member && (!selectedMember || selectedMember.id.toString() !== selectedMemberId)) {
        onSelectMember(member);
      }
    }
  });

  const memberItems = $derived(
    filteredMembers.map(m => ({
      label: `${formatMemberName(m)} (Licence: ${formatLicence(m.licence)})`,
      value: m.id.toString()
    }))
  );
</script>

<div class="space-y-1.5 relative">
  <Label for="expense-member-input" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Demandeur (Adhérent)</Label>
  <SearchableCombobox
    items={memberItems}
    placeholder="Rechercher par Nom, Prénom, ou N° Licence..."
    bind:value={selectedMemberId}
  />
</div>
