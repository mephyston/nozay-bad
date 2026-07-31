<script lang="ts">
  import { Upload, Sparkles, ShieldAlert } from '@lucide/svelte';
  import { Button, PageHeader, FormField, Alert, Select } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state = $bindable() }: { state: ReconciliationState } = $props();
</script>

{#if state.isClosed}
  <Alert.Root variant="warning" class="flex items-center gap-3">
    <ShieldAlert class="h-5 w-5 shrink-0" />
    <Alert.Description class="text-sm">
      <span class="font-semibold">Saison clôturée.</span> Les opérations de rapprochement bancaire et de création d'écritures sont désactivées pour cette saison.
  </Alert.Description>
  </Alert.Root>
{/if}

<PageHeader
  title="Rapprochement & Pointage Bancaire"
  description="Importez vos relevés bancaires (OFX/CSV) et associez vos lignes aux écritures comptables."
>
  {#snippet actions()}
    <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
      {#if state.seasons && state.seasons.length > 0}
        <div class="flex items-center gap-2 shrink-0">
          <FormField id="select-season" label="Saison : ">
          <Select
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
          </Select>
          </FormField>
        </div>
      {/if}

      <!-- Groupe de boutons toujours maintenus ensemble sur la même ligne (flex-nowrap) -->
      <div class="flex items-center gap-2 flex-nowrap flex-1 sm:flex-initial">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs flex-1 sm:flex-initial cursor-pointer whitespace-nowrap"
          disabled={state.isClosed}
          onclick={() => state.showImportModal = true}
        >
          <Upload class="h-3.5 w-3.5" />
          <span>Importer (OFX)</span>
        </Button>

        <Button
          size="sm"
          variant="ai"
          class="gap-1.5 text-xs flex-1 sm:flex-initial cursor-pointer whitespace-nowrap"
          disabled={state.isClosed || state.isAnalyzing || state.pendingCount === 0}
          onclick={state.handleAnalyze}
        >
          <Sparkles class="h-3.5 w-3.5" />
          <span>{state.isAnalyzing ? 'Analyse...' : 'Analyse IA'}</span>
        </Button>
      </div>
    </div>
  {/snippet}
</PageHeader>
