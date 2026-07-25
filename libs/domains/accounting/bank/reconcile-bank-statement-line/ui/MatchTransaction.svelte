<script lang="ts">
  import { Check, Sparkles } from '@lucide/svelte';
  import { Button, Input, Table, Amount } from '@nba/ui';

  let {
    glTransactions = [],
    selectedTx,
    remainingAmount = 0,
    selectedMemberId = $bindable(''),
    isSubmitting = false,
    onMatch,
    suggestions = [],
    onSelectAiSuggestion,
    sortedMembers = [],
    isMemberDropdownOpen = $bindable(false),
    memberSearchQuery = $bindable('')
  }: {
    glTransactions: any[];
    selectedTx: any;
    remainingAmount: number;
    selectedMemberId: string;
    isSubmitting: boolean;
    onMatch: (glTxId: number) => void;
    suggestions: any[];
    onSelectAiSuggestion: (sug: any) => void;
    sortedMembers: any[];
    isMemberDropdownOpen: boolean;
    memberSearchQuery: string;
  } = $props();

  let glCandidates = $derived(
    glTransactions.filter(
      gt => !gt.bankStatementLineId && Math.abs(gt.amount) <= remainingAmount
    )
  );

  let filteredMembers = $derived(
    memberSearchQuery.trim() === ''
      ? sortedMembers
      : sortedMembers.filter(m =>
          `${m.firstName} ${m.lastName} ${m.licence}`
            .toLowerCase()
            .includes(memberSearchQuery.toLowerCase())
        )
  );
</script>

<div class="space-y-4">
  {#if suggestions && suggestions.length > 0}
    <div class="bg-primary/10 border border-primary/20 p-3 rounded-lg text-xs space-y-2">
      <div class="flex items-center gap-1 text-primary font-semibold">
        <Sparkles class="w-3.5 h-3.5" />
        <span>Suggestion de rapprochement IA</span>
      </div>
      {#each suggestions as sug}
        <div class="flex justify-between items-center bg-card p-2 rounded border border-border">
          <div>
            <span class="font-medium text-foreground">{sug.reasoning}</span>
            {#if sug.memberName}
              <div class="text-primary font-semibold mt-0.5">Adhérent détecté : {sug.memberName}</div>
            {/if}
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onclick={() => onSelectAiSuggestion(sug)}
          >
            Appliquer
          </Button>
        </div>
      {/each}
    </div>
  {/if}

  <h4 class="text-sm font-semibold text-foreground">Associer à une écriture comptable existante</h4>
  
  {#if glCandidates.length === 0}
    <div class="text-center py-6 text-sm text-muted-foreground italic">
      Aucune écriture correspondante trouvée à +/- 7 jours.
    </div>
  {:else}
    <div class="max-h-60 overflow-y-auto border border-border rounded-lg text-xs">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Date</Table.Head>
            <Table.Head>Description</Table.Head>
            <Table.Head>Type</Table.Head>
            <Table.Head>Montant</Table.Head>
            <Table.Head>Action</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each glCandidates as gt}
            <Table.Row>
              <Table.Cell>{gt.date}</Table.Cell>
              <Table.Cell class="font-medium">{gt.description}</Table.Cell>
              <Table.Cell>{gt.type}</Table.Cell>
              <Table.Cell class="font-semibold"><Amount cents={Math.abs(gt.amount)} /></Table.Cell>
              <Table.Cell>
                <Button 
                  size="sm" 
                  onclick={() => onMatch(gt.id)}
                  disabled={isSubmitting}
                >
                  <Check class="w-3 h-3 mr-1" /> Associer
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}

  <div class="border-t border-border pt-4">
    <span class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      Lier à un adhérent (optionnel)
    </span>
    <div class="relative">
      <button
        type="button"
        onclick={() => isMemberDropdownOpen = !isMemberDropdownOpen}
        class="w-full flex justify-between items-center bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span>
          {#if selectedMemberId}
            {sortedMembers.find(m => String(m.id) === selectedMemberId)?.lastName || ''} {sortedMembers.find(m => String(m.id) === selectedMemberId)?.firstName || ''}
          {:else}
            Choisir un adhérent...
          {/if}
        </span>
        <span class="text-muted-foreground">▼</span>
      </button>

      <div class="absolute z-50 w-full mt-1 bg-popover border border-border text-popover-foreground rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-2" class:hidden={!isMemberDropdownOpen}>
        <Input 
          placeholder="Tapez pour rechercher un adhérent..." 
          bind:value={memberSearchQuery} 
          size="sm"
        />
        <div class="space-y-0.5">
          <button
            type="button"
            onclick={() => { selectedMemberId = ''; isMemberDropdownOpen = false; }}
            class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs text-destructive font-medium"
          >
            Aucun lien adhérent
          </button>
          {#each filteredMembers as m}
            <button
              type="button"
              onclick={() => { selectedMemberId = String(m.id); isMemberDropdownOpen = false; }}
              class="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs flex justify-between text-foreground"
            >
              <span>{m.lastName} {m.firstName}</span>
              <span class="text-muted-foreground">{m.licence}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
