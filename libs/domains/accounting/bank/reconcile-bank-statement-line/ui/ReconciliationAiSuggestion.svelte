<script lang="ts">
  import { Sparkles, Check } from '@lucide/svelte';
  import { Button, Badge } from '@nba/ui';
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
  <div class="rounded-xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/40 p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-sm">
        <Sparkles class="h-4 w-4" />
        <span>Suggestion d'analyse automatique IA</span>
      </div>
      {#if sug.confidence}
        <Badge variant="outline" class="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 text-[10px]">
          Confiance : {Math.round(sug.confidence * 100)}%
        </Badge>
      {/if}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div>
        <span class="text-muted-foreground block">Catégorie suggérée :</span>
        <span class="font-medium text-foreground">
          {state.categories.find(c => c.id === String(sug.category))?.name || `Catégorie #${sug.category}`}
        </span>
      </div>

      <div>
        <span class="text-muted-foreground block">Adhérent identifié :</span>
        <span class="font-medium text-foreground">
          {sug.memberName || (sug.memberId ? `Adhérent #${sug.memberId}` : 'Aucun (Général)')}
        </span>
      </div>
    </div>

    {#if sug.reason}
      <p class="text-xs text-muted-foreground italic border-t border-purple-200/60 dark:border-purple-900/40 pt-2 mt-2">
        « {sug.reason} »
      </p>
    {/if}

    <div class="pt-1 flex justify-end">
      <Button
        size="sm"
        class="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
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
  </div>
{/if}
