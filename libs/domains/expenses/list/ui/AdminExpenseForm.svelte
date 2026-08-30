<script lang="ts">
  import { Receipt, Check, AlertCircle } from '@lucide/svelte';
  import { Button, Alert, Sheet, Input, FormField, submitForm } from '@nba/ui';
  import type { Member, Props } from '../../create/ui/expense-form-types';
  import { formatMemberName, scrollOptionIntoView } from '../../create/ui/expense-form-utils';
  import ExpenseFormDetails from '../../create/ui/ExpenseFormDetails.svelte';
  import ExpenseFormFileInput from '../../create/ui/ExpenseFormFileInput.svelte';

  let { activeSeasonId, members = [], categories = [], onClose, onSuccess }: Props & { onClose: () => void; onSuccess: () => void; } = $props();

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

  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  const visibleCategories = $derived(categories.filter(c => !c.hideInExpenses).map(c => ({ value: c.id, label: c.adherentLabel })));

  $effect(() => {
    if (visibleCategories.length > 0 && !category) category = visibleCategories[0].value;
  });

  $effect(() => { if (!isMemberDropdownOpen) highlightedIndex = -1; });
  $effect(() => { if (highlightedIndex >= filteredMembers.length) highlightedIndex = filteredMembers.length - 1; });

  let sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  let selectedMember = $derived(members.length > 0 ? (members.find(m => m.id.toString() === selectedMemberId) || null) : lastSelectedMember);
  let memberDisplayVal = $derived(selectedMember ? formatMemberName(selectedMember) : '');
  let filteredMembers = $derived(
    memberSearchQuery.trim() === ''
      ? sortedMembers
      : sortedMembers.filter(m =>
          `${m.lastName} ${m.firstName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          `${m.firstName} ${m.lastName} ${m.licence}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
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

  function validate(): string | null {
    if (!selectedMemberId) return "Veuillez sélectionner un demandeur.";
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return "Montant invalide.";
    if (!photoUrl) return "Justificatif obligatoire.";
    return null;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = null;
    submitting = true;

    await submitForm({
      validate,
      submit: async () => {
        const res = await fetch('', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'expense',
            data: {
              seasonId: activeSeasonId,
              description,
              category,
              // `amount`, et non `amountCents` : le validateur de l'API n'accepte que ce
              // nom depuis qu'il a cessé de tolérer `amountCents || amount`. Ce
              // durcissement n'avait corrigé que le formulaire adhérent — celui-ci
              // envoyait un champ hors contrat, et toute création échouait en 400.
              amount: Math.round(parseFloat(amountStr) * 100),
              photoUrl,
              memberId: parseInt(selectedMemberId),
              emitterName
            }
          })
        });
        const resData = await res.json() as any;
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || "Erreur lors de la création de la note de frais.");
        }
        return resData.message as string | undefined;
      },
      success: (message) => message || "Note de frais créée.",
      close: onSuccess,
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => { errorMsg = message; }
    });

    submitting = false;
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

    <FormField id="expense-member-input" label="Demandeur (Adhérent)">
      <div class="relative">
        <Input
          id="expense-member-input"
          type="text"
          placeholder="🔍 Rechercher un demandeur par nom ou licence..."
          class="pr-8 font-medium"
          value={isMemberDropdownOpen ? memberSearchQuery : memberDisplayVal}
          oninput={(e) => {
            isMemberDropdownOpen = true;
            memberSearchQuery = (e.target as HTMLInputElement).value;
          }}
          onfocus={() => {
            isMemberDropdownOpen = true;
            memberSearchQuery = '';
          }}
          onblur={() => {
            setTimeout(() => { isMemberDropdownOpen = false; }, 200);
          }}
          onkeydown={handleKeyDown}
        />
        {#if selectedMemberId}
          <Button
            variant="ghost"
            size="icon-xs"
            onclick={() => {
              selectedMemberId = '';
              memberSearchQuery = '';
              lastSelectedMember = null;
            }}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Effacer la sélection"
          >
            ✕
          </Button>
        {/if}

        {#if isMemberDropdownOpen}
          <div class="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg divide-y divide-border">
            {#each filteredMembers as member, idx}
              <Button
                variant="ghost"
                class="w-full text-left justify-start rounded-none px-3 py-2 text-sm text-foreground transition-colors font-medium border-0 cursor-pointer {idx === highlightedIndex ? 'bg-muted' : 'bg-popover'} hover:bg-muted"
                onmousedown={() => selectMember(member)}
              >
                {member.lastName} {member.firstName} ({member.licence})
              </Button>
            {:else}
              <div class="px-3 py-2 text-xs text-muted-foreground italic bg-popover">Aucun adhérent trouvé</div>
            {/each}
          </div>
        {/if}
      </div>
    </FormField>

    <ExpenseFormDetails bind:category bind:amountStr bind:description {visibleCategories} />

    <ExpenseFormFileInput bind:photoUrl bind:fileInput onError={(msg) => { errorMsg = msg; }} />


  </div>

  <Sheet.Footer class="p-6 border-t border-border bg-muted/30 flex justify-end gap-2 shrink-0">
    <Button
      type="button"
      variant="outline"
      onclick={onClose}
      disabled={submitting}
    >
      Annuler
    </Button>
    <Button
      type="submit"
      disabled={submitting || !selectedMemberId || !amountStr || !description}
      class="flex items-center gap-2"
    >
      {#if submitting}
        <div class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <Check class="w-4 h-4" />
      {/if}
      Valider
    </Button>
  </Sheet.Footer>
</form>
