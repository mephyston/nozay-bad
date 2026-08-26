<script lang="ts">
  import { Upload, Sparkles, ShieldAlert } from '@lucide/svelte';
  import { Button, PageHeader, Label, Alert, SearchableCombobox, softNavigate } from '@nba/ui';
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
        <!--
          Le libellé reste, mais ne s'affiche plus.

          `FormField` l'empilait au-dessus du champ : dans une barre d'outils, cela faisait deux
          lignes pour un contrôle qui en occupe une. Le poser à gauche donnait « Saison — Saison
          2025-2026 », la valeur se décrivant déjà elle-même. Il subsiste pour les lecteurs
          d'écran, à qui le seul `<button>` du combobox ne dirait rien.
        -->
        <div class="flex items-center gap-2 shrink-0">
          <Label for="select-season" class="sr-only">Saison comptable</Label>
          <SearchableCombobox
            id="select-season"
            items={state.seasons.map((s) => ({ label: `${s.name || s.code} ${s.active ? '(Active)' : ''}`.trim(), value: String(s.code || s.id) }))}
            bind:value={state.selectedSeason}
            onValueChange={() => { const url = new URL(window.location.href); url.searchParams.set('season', String(state.selectedSeason)); softNavigate(url.toString()); }}
          />
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
