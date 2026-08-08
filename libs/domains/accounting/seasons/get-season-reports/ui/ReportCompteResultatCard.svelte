<script lang="ts">
  import { Button, Card, Alert } from '@nba/ui';
  import { Sparkles } from '@lucide/svelte';
  import type { ReportData, Season, DbCategory, AccountClass } from './report-types';
  import ReportChargesColumn from './ReportChargesColumn.svelte';
  import ReportProduitsColumn from './ReportProduitsColumn.svelte';
  import ReportAIAnalysis from './ReportAIAnalysis.svelte';
  import { formatAmount } from './report-utils';

  // Sur écran étroit (< xl) : la 2e colonne montre soit le prévisionnel, soit
  // l'écart (les deux sont visibles simultanément à partir de xl).
  let secondaryView = $state<'previsionnel' | 'ecart'>('previsionnel');
  
  let isSuggesting = $state(false);
  
  async function suggestBudget() {
    isSuggesting = true;
    try {
      const response = await fetch(`/api/accounting/seasons/${selectedSeason}/ai/budget-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, categories, currentBudget: editableBudget })
      });
      const data = await response.json();
      if (data.success && data.data?.suggestions) {
        for (const sug of data.data.suggestions) {
          const cat = categories.find(c => c.adminLabel === sug.categoryName);
          if (cat) {
            const key = `${cat.id}_${sug.type}`;
            // Mettre à jour si vide ou 0 (ne pas écraser les valeurs déjà saisies)
            if (!editableBudget[key] || editableBudget[key] === 0) {
              editableBudget[key] = Math.round(sug.suggestedAmount * 100);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      isSuggesting = false;
    }
  }

  let {
    mode,
    report,
    prevReport = null,
    selectedSeason,
    seasons = [],
    categories = [],
    chargeClasses,
    produitClasses,
    editableBudget = $bindable({}),
    isClosed,
    isSaving,
    saveStatus,
    getClassCategories,
    getClassSumRealise,
    getClassSumPrevisionnel,
    getCatTotal,
    getTotalDepensesRealise,
    getTotalRecettesRealise,
    totalDepensesPrevisionnel,
    totalRecettesPrevisionnel,
    onSaveBudget,
    canUseAi = false
  }: {
    mode: 'realise' | 'previsionnel';
    report: ReportData;
    prevReport?: ReportData | null;
    selectedSeason: string;
    seasons?: Season[];
    categories?: DbCategory[];
    chargeClasses: AccountClass[];
    produitClasses: AccountClass[];
    editableBudget: Record<string, number>;
    isClosed: boolean;
    isSaving: boolean;
    saveStatus: { type: 'success' | 'error'; message: string } | null;
    getClassCategories: (classCode: string, type: 'recette' | 'depense') => DbCategory[];
    getClassSumRealise: (classCode: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => number;
    getClassSumPrevisionnel: (classCode: string, type: 'recette' | 'depense') => number;
    getCatTotal: (id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => number;
    getTotalDepensesRealise: (mode: 'realise' | 'previsionnel') => number;
    getTotalRecettesRealise: (mode: 'realise' | 'previsionnel') => number;
    totalDepensesPrevisionnel: number;
    totalRecettesPrevisionnel: number;
    onSaveBudget: () => void;
    canUseAi?: boolean;
  } = $props();

  const totalDepReal = $derived(getTotalDepensesRealise(mode));
  const totalRecReal = $derived(getTotalRecettesRealise(mode));
  const netResReal = $derived(totalRecReal - totalDepReal);
  const netResPrev = $derived(totalRecettesPrevisionnel - totalDepensesPrevisionnel);
</script>

<Card.Root class="print-container">
  <Card.Content class="p-6 space-y-6">
    <div class="hidden print:block text-center space-y-1 mb-6">
      <h3 class="text-xl font-bold tracking-tight">
        {mode === 'realise' ? 'Compte de Résultat Simplifié (Réalisé)' : 'Budget Prévisionnel'}
      </h3>
      <p class="text-xs text-muted-foreground">Saison {seasons.find(s => s.id === selectedSeason)?.name || selectedSeason}</p>
    </div>

    <div class="flex items-center justify-between gap-3 border-b border-border pb-4 no-print">
      <h3 class="text-lg font-semibold">
        {mode === 'realise' ? 'Compte de Résultat' : 'Budget Prévisionnel'}
      </h3>
      {#if mode === 'realise'}
        <!-- Segmented control mobile/tablette : bascule la 2e colonne (masqué dès xl
             où les 3 colonnes tiennent). Boutons collés, arrondis extérieurs,
             vue active en couleur primaire. -->
        <div class="inline-flex shrink-0 overflow-hidden rounded-lg border border-input xl:hidden" role="group" aria-label="Colonne à afficher">
          <button
            type="button"
            aria-pressed={secondaryView === 'previsionnel'}
            onclick={() => secondaryView = 'previsionnel'}
            class="h-7 px-3 text-xs font-medium transition-colors {secondaryView === 'previsionnel' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}"
          >Prévu</button>
          <button
            type="button"
            aria-pressed={secondaryView === 'ecart'}
            onclick={() => secondaryView = 'ecart'}
            class="h-7 border-l border-input px-3 text-xs font-medium transition-colors {secondaryView === 'ecart' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}"
          >Écart</button>
        </div>
      {/if}
    </div>

    <div class="grid gap-6 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
      <ReportChargesColumn
        {mode}
        {prevReport}
        {selectedSeason}
        {seasons}
        {chargeClasses}
        bind:editableBudget
        {isClosed}
        {secondaryView}
        {getClassCategories}
        {getClassSumRealise}
        {getClassSumPrevisionnel}
        {getCatTotal}
        {netResReal}
        {netResPrev}
        {totalDepReal}
        {totalDepensesPrevisionnel}
      />

      <ReportProduitsColumn
        {mode}
        {prevReport}
        {selectedSeason}
        {seasons}
        {produitClasses}
        bind:editableBudget
        {isClosed}
        {secondaryView}
        {getClassCategories}
        {getClassSumRealise}
        {getClassSumPrevisionnel}
        {getCatTotal}
        {netResReal}
        {netResPrev}
        {totalRecReal}
        {totalRecettesPrevisionnel}
      />
    </div>

    {#if report?.tresorerieDisponible && (report.tresorerieDisponible.deferredRevenues.length > 0 || report.tresorerieDisponible.deferredExpenses.length > 0)}
      <div class="mt-4 pt-4 border-t border-border/40 space-y-2 no-print">
        <h5 class="font-semibold text-xs uppercase text-muted-foreground">Régularisations Comptables</h5>
        <div class="bg-muted/30 rounded-xl p-4 space-y-2 border border-border text-sm">
          {#if report.tresorerieDisponible.deferredRevenues.length > 0}
            <div class="space-y-1 text-xs text-muted-foreground">
              <span class="font-medium text-warning block">• Produits encaissés d'avance (à déduire du résultat) :</span>
              {#each report.tresorerieDisponible.deferredRevenues as defRev}
                <div class="flex justify-between pl-4">
                  <span>{defRev.categoryName}</span>
                  <span>- {formatAmount(defRev.amountCents)}</span>
                </div>
              {/each}
            </div>
          {/if}

          {#if report.tresorerieDisponible.deferredExpenses.length > 0}
            <div class="space-y-1 text-xs text-muted-foreground mt-3">
              <span class="font-medium text-info block">• Charges décaissées d'avance (à réintégrer au résultat) :</span>
              {#each report.tresorerieDisponible.deferredExpenses as defExp}
                <div class="flex justify-between pl-4">
                  <span>{defExp.categoryName}</span>
                  <span>+ {formatAmount(defExp.amountCents)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if mode === 'previsionnel' && !isClosed}
      <div class="flex flex-col gap-3 pt-4 border-t border-border mt-6 no-print">
        {#if saveStatus}
          <Alert.Root variant={saveStatus.type === 'success' ? 'success' : 'destructive'} class="p-3 text-xs rounded-lg">
          <Alert.Description>{saveStatus.message}</Alert.Description>
          </Alert.Root>
        {/if}
        
        <div class="flex justify-end gap-3">
          {#if canUseAi}
            <Button
              variant="outline"
              onclick={suggestBudget}
              disabled={isSuggesting}
              class="flex items-center gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
            >
              <Sparkles class="w-4 h-4" />
              {#if isSuggesting}
                Génération...
              {:else}
                Aide à la saisie IA
              {/if}
            </Button>
          {/if}
          <Button
            onclick={onSaveBudget}
            disabled={isSaving}
            class="flex items-center gap-1.5"
          >
            {#if isSaving}
              Enregistrement...
            {:else}
              Enregistrer le Prévisionnel
            {/if}
          </Button>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>

<ReportAIAnalysis {report} section="resultat" seasonId={selectedSeason} {canUseAi} />
