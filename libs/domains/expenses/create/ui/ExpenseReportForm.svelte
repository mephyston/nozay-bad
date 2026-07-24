<script lang="ts">
  import { CheckCircle, AlertCircle, Coins } from '@lucide/svelte';
  import { Button, Card } from '@nba/ui';
  import type { Member, Props } from './expense-form-types';
  import { formatMemberName, scrollOptionIntoView } from './expense-form-utils';
  import { submitExpenseReport } from './expense-form-submit';
  import ExpenseFormMemberSelect from './ExpenseFormMemberSelect.svelte';
  import ExpenseFormDetails from './ExpenseFormDetails.svelte';
  import ExpenseFormFileInput from './ExpenseFormFileInput.svelte';

  export * from './expense-form-types';
  export * from './expense-form-utils';
  export * from './expense-form-submit';

  const { activeSeasonId, members = [], categories = [] }: Props = $props();

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

<Card.Root class="max-w-2xl mx-auto shadow-xl">
  <Card.Header class="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground flex flex-row items-center gap-4 rounded-t-xl">
    <div class="bg-primary-foreground/10 p-3 rounded-xl backdrop-blur-md">
      <Coins class="w-7 h-7 text-primary-foreground" />
    </div>
    <div>
      <Card.Title class="text-xl font-bold tracking-tight text-primary-foreground">Saisir une note de frais</Card.Title>
      <p class="text-xs text-primary-foreground/80 mt-1">Soumettez vos dépenses engagées pour le compte de l'association.</p>
    </div>
  </Card.Header>

  <Card.Content class="p-6">
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if successMsg}
        <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-start gap-2.5">
          <CheckCircle class="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      {/if}

      {#if errorMsg}
        <div class="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-start gap-2.5">
          <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
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
