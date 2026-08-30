<script lang="ts">
  import { CheckCircle, AlertCircle, Coins } from '@lucide/svelte';
  import { Button, Card, Alert } from '@nba/ui';
  import type { Member, Props } from './expense-form-types';
  import { formatMemberName, scrollOptionIntoView } from './expense-form-utils';
  import { submitExpenseReport } from './expense-form-submit';
  import ExpenseFormMemberSelect from './ExpenseFormMemberSelect.svelte';
  import ExpenseFormDetails from './ExpenseFormDetails.svelte';
  import ExpenseFormFileInput from './ExpenseFormFileInput.svelte';

  const { activeSeasonId, members = [], categories = [], lockToMembers = false, initialMemberId = '' }: Props = $props();

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
  let successMsg = $state<string | null>(null);
  let errorMsg = $state<string | null>(null);

  const visibleCategories = $derived(categories.filter(c => !c.hideInExpenses).map(c => ({ value: c.id, label: c.adherentLabel })));

  $effect(() => {
    if (visibleCategories.length > 0 && !category) category = visibleCategories[0].value;
  });

  $effect(() => { if (!isMemberDropdownOpen) highlightedIndex = -1; });
  $effect(() => { if (highlightedIndex >= filteredMembers.length) highlightedIndex = filteredMembers.length - 1; });

  // Présélection (foyer connecté) : renseigne le demandeur au montage.
  $effect(() => {
    if (initialMemberId && !selectedMemberId && !emitterName) {
      const m = members.find((mm) => mm.id.toString() === initialMemberId);
      if (m) {
        const name = formatMemberName(m);
        selectedMemberId = m.id.toString();
        memberSearchQuery = name;
        emitterName = name;
        lastSelectedMember = m;
      }
    }
  });

  $effect(() => {
    if (lockToMembers) return; // Foyer verrouillé : pas de recherche globale.
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
    lockToMembers
      ? sortedMembers
      : memberSearchQuery.trim() === ''
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
    errorMsg = null; successMsg = null; submitting = true;
    const res = await submitExpenseReport({ activeSeasonId, description, category, amountStr, photoUrl, emitterName, selectedMemberId });
    submitting = false;

    if (res.success) {
      successMsg = res.message || null;
      emitterName = ''; selectedMemberId = ''; lastSelectedMember = null; memberSearchQuery = '';
      category = visibleCategories[0]?.value || 'fonctionnement_administratif';
      description = ''; amountStr = ''; photoUrl = null;
      if (fileInput) fileInput.value = '';
    } else {
      errorMsg = res.error || null;
    }
  }
</script>

<Card.Root class="max-w-2xl mx-auto shadow-sm">
  <Card.Header class="px-5 py-4 border-b border-border flex flex-row items-center gap-3">
    <Coins class="w-5 h-5 text-primary shrink-0" />
    <div>
      <Card.Title class="text-base font-semibold text-foreground">Saisir une note de frais</Card.Title>
      <p class="text-xs text-muted-foreground mt-0.5">Soumettez vos dépenses engagées pour le compte de l'association.</p>
    </div>
  </Card.Header>

  <Card.Content class="p-4 sm:p-6">
    <form onsubmit={handleSubmit} class="space-y-3 sm:space-y-5">
      {#if successMsg}
        <Alert.Root variant="success" class="p-4 text-sm rounded-xl flex items-start gap-2.5">
          <CheckCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <Alert.Description><span>{successMsg}</span></Alert.Description>
        </Alert.Root>
      {/if}

      {#if errorMsg}
        <Alert.Root variant="destructive" class="p-4 text-sm rounded-xl flex items-start gap-2.5">
          <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <Alert.Description><span>{errorMsg}</span></Alert.Description>
        </Alert.Root>
      {/if}

      {#if lockToMembers}
        <div class="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <span class="text-muted-foreground">Demandeur : </span>
          <span class="font-semibold text-foreground">{selectedMember ? formatMemberName(selectedMember) : '—'}</span>
        </div>
      {:else}
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
      {/if}

      <ExpenseFormDetails bind:category bind:amountStr bind:description {visibleCategories} />

      <ExpenseFormFileInput bind:photoUrl bind:fileInput onError={(msg) => { errorMsg = msg; }} />

      <Button
        type="submit"
        disabled={submitting}
        class="w-full h-auto py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-sm transition-colors shadow-lg border-0 mt-4"
      >
        {#if submitting}
          <span class="animate-pulse">Soumission en cours...</span>
        {:else}
          <CheckCircle data-icon="inline-start" />
          Soumettre la note de frais
        {/if}
      </Button>
    </form>
  </Card.Content>
</Card.Root>
