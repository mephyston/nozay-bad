<script lang="ts">
  import { Search, ChevronDown, Check, AlertCircle } from "@lucide/svelte";
  import { Input, Label, Badge, SearchableCombobox, FormField } from '@nba/ui';
  import type { Member } from './catalog-types';
  import { formatMemberName, formatLicence } from './catalog-utils';

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

<div class="space-y-3 pb-4 border-b border-border">
<FormField id="member-input" label="Acheteur (Adhérent)">
  <div class="relative">
    <SearchableCombobox
      items={memberItems}
      placeholder="Rechercher par Nom, Prénom, ou N° Licence..."
      bind:value={selectedMemberId}
    />
  </div>
  </FormField>

  <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
    {#if selectedMember}
      <Badge variant="primary-soft" size="lg" shape="square" class="self-start sm:self-auto">
        <Check class="w-4 h-4" />
        Adhérent sélectionné : <span class="font-bold">{formatMemberName(selectedMember)}</span>
      </Badge>
    {:else}
      <Badge variant="destructive" size="lg" shape="square" class="self-start sm:self-auto">
        <AlertCircle class="w-4 h-4" />
        Sélectionnez votre nom d'adhérent pour débloquer la commande.
      </Badge>
    {/if}
  </div>
</div>
