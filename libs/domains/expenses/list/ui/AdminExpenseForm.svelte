<script lang="ts">
  import { Check, Receipt, CheckCircle, AlertCircle } from '@lucide/svelte';
  import { Button, Alert, Sheet } from '@nba/ui';
  import type { Member, Props } from '../../create/ui/expense-form-types';
  import { formatMemberName, scrollOptionIntoView } from '../../create/ui/expense-form-utils';
  import { submitExpenseReport } from '../../create/ui/expense-form-submit';
  import ExpenseFormMemberSelect from '../../create/ui/ExpenseFormMemberSelect.svelte';
  import ExpenseFormDetails from '../../create/ui/ExpenseFormDetails.svelte';
  import ExpenseFormFileInput from '../../create/ui/ExpenseFormFileInput.svelte';

  let { activeSeasonId, members = [], categories = [], onClose, onSuccess }: Props & { onClose: () => void; onSuccess: (msg: string) => void; } = $props();

  let emitterName = $state('');
  let category = $state('');
  let description = $state('');
  let amountStr = $state('');
  let photoUrl = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  let selectedMemberId = $state('');
  let memberSearchQuery = $state('');
  let isMemberDropdownOpen = $state(false);
  let highlightedIndex = $state(-1);
  let lastSelectedMember = $state<Member | null>(null);
  let fetchedMembers = $state<Member[]>([]);
  let debounceTimeout: any;

  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  const visibleCategories = $derived(categories.filter(c => !c.hideInExpenses).map(c => ({ value: c.id, label: c.adherentLabel })));

  $effect(() => {
    if (visibleCategories.length > 0 && !category) category = visibleCategories[0].value;
  });

  $effect(() => { if (!isMemberDropdownOpen) highlightedIndex = -1; });
  $effect(() => { if (highlightedIndex >= filteredMembers.length) highlightedIndex = filteredMembers.length - 1; });

  $effect(() => {
    if (!isMemberDropdownOpen) return;
    const query = memberSearchQuery.trim();
    if (lastSelectedMember && memberSearchQuery === formatMemberName(lastSelectedMember)) return;
    if (query.length > 0 && query.length < 3) return;

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/members-search?q=${encodeURIComponent(query)}`);
        if (response.ok) fetchedMembers = await response.json() as Member[];
      } catch (err) { console.error('Error fetching members from API:', err); }
    }, query === '' ? 0 : 300);

    return () => { if (debounceTimeout) clearTimeout(debounceTimeout); };
  });

  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  let selectedMember = $derived(members.length > 0 ? (members.find(m => m.id.toString() === selectedMemberId) || null) : lastSelectedMember);
  let memberDisplayVal = $derived(selectedMember ? formatMemberName(selectedMember) : '');
  let filteredMembers = $derived(
    memberSearchQuery.trim() === ''
      ? (fetchedMembers.length > 0 ? fetchedMembers : sortedMembers)
      : (fetchedMembers.length > 0
          ? fetchedMembers
          : sortedMembers.filter(m =>
              `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
              `${m.firstName} ${m.lastName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
            )
        )
  );

  function selectMember(m: Member) {
    selectedMemberId = m.id.toString();
    lastSelectedMember = m;
    const name = formatMemberName(m);
    memberSearchQuery = name;
    emitterName = name;
    isMemberDropdownOpen = false;
    highlightedIndex = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isMemberDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { isMemberDropdownOpen = true; highlightedIndex = 0; e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      if (filteredMembers.length > 0) { highlightedIndex = (highlightedIndex + 1) % filteredMembers.length; scrollOptionIntoView(highlightedIndex); }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (filteredMembers.length > 0) { highlightedIndex = (highlightedIndex - 1 + filteredMembers.length) % filteredMembers.length; scrollOptionIntoView(highlightedIndex); }
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredMembers.length) { selectMember(filteredMembers[highlightedIndex]); e.preventDefault(); }
    } else if (e.key === 'Escape') { isMemberDropdownOpen = false; e.preventDefault(); }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = null; submitting = true;
    const res = await submitExpenseReport({ activeSeasonId, description, category, amountStr, photoUrl, emitterName, selectedMemberId });
    submitting = false;

    if (res.success) {
      onSuccess(res.message || "Note de frais créée avec succès.");
    } else {
      errorMsg = res.error || null;
    }
  }
</script>

<Sheet.Header class="p-6 border-b border-border">
  <Sheet.Title class="flex items-center gap-2">
    <Receipt class="w-5 h-5 text-primary" />
    Créer une note de frais
  </Sheet.Title>
  <Sheet.Description class="hidden">Formulaire de création de note de frais (Admin).</Sheet.Description>
</Sheet.Header>

<form onsubmit={handleSubmit} class="flex flex-col flex-1 overflow-hidden">
  <div class="p-6 overflow-y-auto space-y-6 flex-1">
    {#if errorMsg}
      <Alert.Root variant="destructive" class="p-4 text-sm flex items-start gap-2.5">
        <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <Alert.Description><span>{errorMsg}</span></Alert.Description>
      </Alert.Root>
    {/if}

    <ExpenseFormMemberSelect
      bind:selectedMemberId
      bind:memberSearchQuery
      bind:isMemberDropdownOpen
      bind:highlightedIndex
      {selectedMember}
      {memberDisplayVal}
      {filteredMembers}
      onSelectMember={selectMember}
      onKeyDown={handleKeyDown}
    />

    <ExpenseFormDetails bind:category bind:amountStr bind:description {visibleCategories} />

    <ExpenseFormFileInput bind:photoUrl bind:fileInput onError={(msg) => { errorMsg = msg; }} />

    <div class="flex justify-center my-4">
      <div class="cf-turnstile" data-sitekey="0x4AAAAAAD1TY7I_ql47XOjI" data-action="turnstile-spin-v1" data-size="invisible"></div>
    </div>
  </div>

  <Sheet.Footer class="p-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-end items-center gap-4 shrink-0">
    <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
      <Button type="button" variant="outline" onclick={onClose} disabled={submitting}>
        Annuler
      </Button>
      <Button type="submit" disabled={submitting || !selectedMemberId || !amountStr || !description} class="gap-1.5 min-w-[120px]">
        {#if submitting}
          <div class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
          Validation...
        {:else}
          <Check class="w-4 h-4" /> Valider
        {/if}
      </Button>
    </div>
  </Sheet.Footer>
</form>
