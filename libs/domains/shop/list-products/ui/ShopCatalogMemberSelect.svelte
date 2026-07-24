<script lang="ts">
  import { Search, ChevronDown, Check, AlertCircle } from "@lucide/svelte";
  import { Input, Label, Badge } from '@nba/ui';
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
</script>

<div class="space-y-3 pb-4 border-b border-border">
  <Label for="member-input" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Acheteur (Adhérent)</Label>

  <div class="relative">
    <div class="relative">
      <Search class="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground z-10" />
      <Input
        id="member-input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-expanded={isMemberDropdownOpen}
        aria-autocomplete="list"
        aria-controls="member-listbox"
        aria-activedescendant={highlightedIndex >= 0 ? `member-option-${highlightedIndex}` : undefined}
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
      />
      <ChevronDown class="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
    </div>

    {#if isMemberDropdownOpen}
      <div
        role="listbox"
        id="member-listbox"
        class="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl divide-y divide-border"
      >
        {#each filteredMembers as m, index}
          <button
            type="button"
            role="option"
            aria-selected={selectedMemberId === m.id.toString()}
            id={`member-option-${index}`}
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

  <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
    {#if selectedMember}
      <Badge variant="outline" class="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
        <Check class="w-4 h-4" />
        Adhérent sélectionné : <span class="font-bold">{formatMemberName(selectedMember)}</span>
      </Badge>
    {:else}
      <Badge variant="destructive" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
        <AlertCircle class="w-4 h-4" />
        Sélectionnez votre nom d'adhérent pour débloquer la commande.
      </Badge>
    {/if}
  </div>
</div>
