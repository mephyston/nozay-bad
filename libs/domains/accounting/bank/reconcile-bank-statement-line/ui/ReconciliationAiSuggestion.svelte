<script lang="ts">
  import { Sparkles, Check } from '@lucide/svelte';
  import { Button, Badge, Alert } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  let { state = $bindable(), selectedTx }: { state: ReconciliationState; selectedTx: BankStatementLine } = $props();

  function renderAiSuggestions(bt: BankStatementLine) {
    if (!bt.aiSuggestions) return null;
    try {
      return JSON.parse(bt.aiSuggestions);
    } catch (e) {
      return null;
    }
  }

  const sug = $derived(renderAiSuggestions(selectedTx));
</script>

{#if sug}
  <Alert.Root variant="ai" class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <Alert.Title class="flex items-center gap-2 m-0 p-0 font-semibold text-sm">
        <Sparkles class="h-4 w-4" />
        <span>Suggestion d'analyse automatique IA</span>
      </Alert.Title>
      {#if sug.confidence}
        <Badge variant="ai" size="xs">
          Confiance : {Math.round(sug.confidence * 100)}%
        </Badge>
      {/if}
    </div>

<Alert.Description class="space-y-3 m-0 p-0">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div>
        <span class="text-muted-foreground opacity-80 block">Catégorie suggérée :</span>
        <span class="font-medium text-foreground">
          {state.categories.find(c => c.id === String(sug.category))?.name || `Catégorie #${sug.category}`}
        </span>
      </div>

      <div>
        <span class="text-muted-foreground opacity-80 block">Adhérent identifié :</span>
        <span class="font-medium text-foreground">
          {sug.memberName || (sug.memberId ? `Adhérent #${sug.memberId}` : 'Aucun (Général)')}
        </span>
      </div>
    </div>

    {#if sug.reason}
      <p class="text-xs italic border-t border-purple-500/20 pt-2 mt-2">
        « {sug.reason} »
      </p>
    {/if}

    <div class="pt-1 flex justify-end">
      <Button
        size="sm"
        variant="ai"
        class="text-xs gap-1.5"
        disabled={state.isClosed || state.isSubmitting}
        onclick={() => state.handleMatchWithAI(
          selectedTx.id,
          sug.memberId ? parseInt(sug.memberId) : null,
          String(sug.category || '1')
        )}
      >
        <Check class="h-3.5 w-3.5" />
        <span>Valider cette suggestion</span>
      </Button>
    </div>
  </Alert.Description>
  </Alert.Root>
{/if}
