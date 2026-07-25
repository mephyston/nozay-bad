<script lang="ts">
  import { Upload, Sparkles, ShieldAlert } from '@lucide/svelte';
  import { Button } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state }: { state: ReconciliationState } = $props();
</script>

{#if state.isClosed}
  <div class="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-amber-800 dark:text-amber-200 flex items-center gap-3">
    <ShieldAlert class="h-5 w-5 shrink-0" />
    <div class="text-sm">
      <span class="font-semibold">Saison clôturée.</span> Les opérations de rapprochement bancaire et de création d'écritures sont désactivées pour cette saison.
    </div>
  </div>
{/if}

<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
  <div>
    <h2 class="text-xl font-bold tracking-tight">Rapprochement & Pointage Bancaire</h2>
    <p class="text-sm text-muted-foreground">Importez vos relevés bancaires (OFX/CSV) et associez vos lignes aux écritures comptables.</p>
  </div>

  <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
    {#if state.seasons && state.seasons.length > 0}
      <div class="flex items-center gap-2 shrink-0">
        <label for="select-season" class="text-xs font-medium text-muted-foreground whitespace-nowrap">Saison :</label>
        <select
          id="select-season"
          bind:value={state.selectedSeason}
          onchange={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('season', state.selectedSeason);
            window.location.href = url.toString();
          }}
          class="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        >
          {#each state.seasons as s}
            <option value={s.code || String(s.id)}>{s.name || s.code} {s.active ? '(Active)' : ''}</option>
          {/each}
        </select>
      </div>
    {/if}

    <Button
      variant="outline"
      size="sm"
      class="gap-2 text-xs flex-1 sm:flex-initial cursor-pointer"
      disabled={state.isClosed}
      onclick={() => state.showImportModal = true}
    >
      <Upload class="h-3.5 w-3.5" />
      <span>Importer (OFX)</span>
    </Button>

    <Button
      size="sm"
      class="gap-2 text-xs flex-1 sm:flex-initial cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
      disabled={state.isClosed || state.isAnalyzing || state.pendingCount === 0}
      onclick={state.handleAnalyze}
    >
      <Sparkles class="h-3.5 w-3.5" />
      <span>{state.isAnalyzing ? 'Analyse...' : 'Analyse IA'}</span>
    </Button>
  </div>
</div>
