<script lang="ts">
  import { Upload, Sparkles, ShieldAlert } from '@lucide/svelte';
  import { Button, PageHeader, Alert, SeasonSelector } from '@nba/ui';
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
      <!--
        Le sélecteur d'exercice, revenu — mais pour CONSULTER, jamais pour rapprocher.

        Il avait été retiré, et les deux tiers de ce raisonnement tiennent toujours : une ligne
        non rapprochée n'appartient à aucun exercice, la file les montre donc toutes, et
        l'exercice de rattachement d'une écriture se choisit dans le formulaire, ligne par
        ligne. Rien de tout cela ne réclame un sélecteur.

        Le troisième tiers, lui, était faux : « consulter un exercice clos n'a aucun objet, sa
        file est vide ». Sa file, oui — mais pas son ARCHIVE, ni son état de rapprochement, ni
        son écart. Faute de sélecteur, les relire imposait de changer le drapeau `active` du
        référentiel, c'est-à-dire un réglage global pour un besoin de lecture.
      -->
      <SeasonSelector seasons={state.seasons} current={state.selectedSeason} size="sm" />

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
