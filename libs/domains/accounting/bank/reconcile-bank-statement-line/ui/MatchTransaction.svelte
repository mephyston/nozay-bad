<script lang="ts">
  import { Check, Sparkles } from '@lucide/svelte';
  import { Button, Input, Table } from '@nba/ui';

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
    <div class="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs space-y-2">
      <div class="flex items-center gap-1 text-indigo-700 font-semibold">
        <Sparkles class="w-3.5 h-3.5" />
        <span>Suggestion de rapprochement IA</span>
      </div>
      {#each suggestions as sug}
        <div class="flex justify-between items-center bg-white p-2 rounded border border-indigo-200">
          <div>
            <span class="font-medium text-gray-800">{sug.reasoning}</span>
            {#if sug.memberName}
              <div class="text-indigo-600 font-semibold mt-0.5">Adhérent détecté : {sug.memberName}</div>
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

  <h4 class="text-sm font-semibold text-gray-700">Associer à une écriture comptable existante</h4>
  
  {#if glCandidates.length === 0}
    <div class="text-center py-6 text-sm text-gray-400 italic">
      Aucune écriture correspondante trouvée à +/- 7 jours.
    </div>
  {:else}
    <div class="max-h-60 overflow-y-auto border rounded-lg text-xs">
      <Table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Type</th>
            <th>Montant</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each glCandidates as gt}
            <tr>
              <td>{gt.date}</td>
              <td class="font-medium">{gt.description}</td>
              <td>{gt.type}</td>
              <td class="font-semibold">{(Math.abs(gt.amount) / 100).toFixed(2)} €</td>
              <td>
                <Button 
                  size="sm" 
                  onclick={() => onMatch(gt.id)}
                  disabled={isSubmitting}
                >
                  <Check class="w-3 h-3 mr-1" /> Associer
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </Table>
    </div>
  {/if}

  <div class="border-t pt-4">
    <span class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
      Lier à un adhérent (optionnel)
    </span>
    <div class="relative">
      <button
        type="button"
        onclick={() => isMemberDropdownOpen = !isMemberDropdownOpen}
        class="w-full flex justify-between items-center bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>
          {#if selectedMemberId}
            {sortedMembers.find(m => String(m.id) === selectedMemberId)?.lastName || ''} {sortedMembers.find(m => String(m.id) === selectedMemberId)?.firstName || ''}
          {:else}
            Choisir un adhérent...
          {/if}
        </span>
        <span class="text-gray-400">▼</span>
      </button>

      <div class="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-2" class:hidden={!isMemberDropdownOpen}>
        <Input 
          placeholder="Tapez pour rechercher un adhérent..." 
          bind:value={memberSearchQuery} 
          size="sm"
        />
        <div class="space-y-0.5">
          <button
            type="button"
            onclick={() => { selectedMemberId = ''; isMemberDropdownOpen = false; }}
            class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-xs text-red-600 font-medium"
          >
            Aucun lien adhérent
          </button>
          {#each filteredMembers as m}
            <button
              type="button"
              onclick={() => { selectedMemberId = String(m.id); isMemberDropdownOpen = false; }}
              class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-xs flex justify-between"
            >
              <span>{m.lastName} {m.firstName}</span>
              <span class="text-gray-400">{m.licence}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
