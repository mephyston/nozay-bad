<script lang="ts">
  import { tick } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { Tabs, Button, DropdownMenu, submitForm } from '@nba/ui';
  import type { ReportData, Season, DbCategory, AccountClass, BudgetRecord } from './report-types';
  import { generatePieSlices } from './report-utils';
  import { defaultChargeClasses, defaultProduitClasses } from './report-constants';
  import {
    getClassCategories as calcGetClassCategories,
    getCatTotal as calcGetCatTotal,
    getClassSumRealise as calcGetClassSumRealise,
    getClassSumPrevisionnel as calcGetClassSumPrevisionnel,
    getTotalDepensesRealise as calcGetTotalDepensesRealise,
    getTotalRecettesRealise as calcGetTotalRecettesRealise
  } from './report-calculations';
  import ReportTresorerieTab from './ReportTresorerieTab.svelte';
  import ReportGraphiquesCard from './ReportGraphiquesCard.svelte';
  import ReportCompteResultatCard from './ReportCompteResultatCard.svelte';
  import ReportAnalytiqueTab from './ReportAnalytiqueTab.svelte';
  import './report-print.css';

  export * from './report-types';
  export * from './report-utils';
  export * from './report-constants';

  let {
    view, report, prevReport = null, seasonId, seasons = [], categories = [], accountClasses = [], budget = [], canUseAi = false
  }: {
    view: 'resultat' | 'analytique' | 'tresorerie' | 'budget';
    report: ReportData; prevReport?: ReportData | null; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; accountClasses?: AccountClass[]; budget?: BudgetRecord[]; canUseAi?: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  let editableBudget = $state<Record<string, number>>({});
  let isSaving = $state(false);
  let saveStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  type PrintTarget = 'resultat' | 'graph-realise' | 'graph-prev';
  let printTarget = $state<PrintTarget | null>(null);

  // Les sections imprimables vivent dans une zone dédiée (hors onglets), toujours
  // montée. On pose la cible, on laisse le DOM se peindre, puis on imprime.
  async function printSection(target: PrintTarget) {
    printTarget = target;
    await tick();
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  // Rapports financiers en PDF (en-tête/pied de page club) : le type découle
  // du segment d'URL courant, on ne fait qu'ajouter la saison + le drapeau pdf.
  // Servi en « inline » → s'ouvre dans un nouvel onglet plutôt que téléchargé.
  function openPdf() {
    window.open(`${window.location.pathname}?pdf=1&season=${encodeURIComponent(selectedSeason)}`, '_blank');
  }

  // La classe cible est retirée une fois la boîte d'impression fermée.
  $effect(() => {
    const clear = () => { printTarget = null; };
    window.addEventListener('afterprint', clear);
    return () => window.removeEventListener('afterprint', clear);
  });

  $effect(() => {
    const newMap: Record<string, number> = {};
    // editableBudget est en CENTIMES (les inputs affichent /100, cf. colonnes).
    for (const item of budget as any[]) newMap[`${item.categoryId}_${item.type}`] = item.amountCents ?? item.amount ?? 0;
    for (const cat of categories) {
      if (cat.receiptCode) { const key = `${cat.id}_recette`; if (newMap[key] === undefined) newMap[key] = 0; }
      if (cat.expenseCode) { const key = `${cat.id}_depense`; if (newMap[key] === undefined) newMap[key] = 0; }
    }
    editableBudget = newMap;
  });

  const getClassCategories = (code: string, type: 'recette' | 'depense') => calcGetClassCategories(categories, code, type, accountClasses);
  const getCatTotal = (id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => calcGetCatTotal(report, prevReport, id, type, mode);
  const getClassSumRealise = (code: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => calcGetClassSumRealise(categories, report, prevReport, code, type, mode, accountClasses);
  const getClassSumPrevisionnel = (code: string, type: 'recette' | 'depense') => calcGetClassSumPrevisionnel(categories, editableBudget, code, type, accountClasses);
  const getTotalDepensesRealise = (mode: 'realise' | 'previsionnel') => calcGetTotalDepensesRealise(accountClasses, categories, report, prevReport, mode);
  const getTotalRecettesRealise = (mode: 'realise' | 'previsionnel') => calcGetTotalRecettesRealise(accountClasses, categories, report, prevReport, mode);

  let totalDepensesPrevisionnel = $derived(
    accountClasses.filter(ac => ac.type === 'depense').reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'depense'), 0)
  );

  let totalRecettesPrevisionnel = $derived(
    accountClasses.filter(ac => ac.type === 'recette').reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'recette'), 0)
  );

  let isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);

  let chargesChartDataRealise = $derived(
    generatePieSlices(accountClasses.filter(ac => ac.type === 'depense').map(ac => ({ label: `${ac.code} - ${ac.label}`, value: getClassSumRealise(ac.code, 'depense', 'realise') })))
  );

  let recettesChartDataRealise = $derived(
    generatePieSlices(accountClasses.filter(ac => ac.type === 'recette').map(ac => ({ label: `${ac.code} - ${ac.label}`, value: getClassSumRealise(ac.code, 'recette', 'realise') })))
  );

  let chargesChartDataPrevisionnel = $derived(
    generatePieSlices(accountClasses.filter(ac => ac.type === 'depense').map(ac => ({ label: `${ac.code} - ${ac.label}`, value: getClassSumPrevisionnel(ac.code, 'depense') })))
  );

  let recettesChartDataPrevisionnel = $derived(
    generatePieSlices(accountClasses.filter(ac => ac.type === 'recette').map(ac => ({ label: `${ac.code} - ${ac.label}`, value: getClassSumPrevisionnel(ac.code, 'recette') })))
  );

  async function handleSaveBudget() {
    isSaving = true;
    saveStatus = null;

    const payload: BudgetRecord[] = Object.entries(editableBudget)
      .map(([key, amount]) => { const [catIdStr, type] = key.split('_'); return { categoryId: parseInt(catIdStr), type: type as 'recette' | 'depense', amount: Math.round(Number(amount) || 0) }; })
      .filter(item => !isNaN(item.categoryId));

    await submitForm({
      submit: async () => {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_budget', seasonId: selectedSeason, budget: payload })
        });
        if (!res.ok) throw new Error((await res.text()) || "Impossible d'enregistrer le budget.");
      },
      // Le réaffichage recalcule la comparaison réalisé / prévisionnel.
      success: 'Budget prévisionnel enregistré.',
      onError: (message) => { saveStatus = { type: 'error', message }; }
    });

    isSaving = false;
  }

  const chargeClasses = $derived(accountClasses.length > 0 ? accountClasses.filter(ac => ac.type === 'depense') : defaultChargeClasses);
  const produitClasses = $derived(accountClasses.length > 0 ? accountClasses.filter(ac => ac.type === 'recette') : defaultProduitClasses);

  const compResultatProps = $derived({
    report, prevReport, selectedSeason, seasons, categories, chargeClasses, produitClasses,
    isClosed, isSaving, saveStatus, getClassCategories, getClassSumRealise, getClassSumPrevisionnel,
    getCatTotal, getTotalDepensesRealise, getTotalRecettesRealise, totalDepensesPrevisionnel,
    totalRecettesPrevisionnel, onSaveBudget: handleSaveBudget, canUseAi
  });
</script>

<div class="space-y-6 {printTarget ? `printing print-${printTarget}` : ''}">
  {#if view !== 'budget'}
    <div class="flex justify-end mb-6 no-print">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} class="h-9 gap-2">
              Imprimer <ChevronDown class="w-4 h-4" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {#if view === 'resultat'}
            <DropdownMenu.Item onclick={openPdf} class="font-medium cursor-pointer">Compte de résultat (PDF)</DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => printSection('graph-realise')} class="font-medium cursor-pointer">Graphiques réalisés</DropdownMenu.Item>
          {/if}
          {#if view === 'analytique'}
            <DropdownMenu.Item onclick={openPdf} class="font-medium cursor-pointer">Suivi analytique (PDF)</DropdownMenu.Item>
          {/if}
          {#if view === 'tresorerie'}
            <DropdownMenu.Item onclick={openPdf} class="font-medium cursor-pointer">Bilan de trésorerie (PDF)</DropdownMenu.Item>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/if}

  <div class="report-screen">
    <div class="space-y-6">
      {#if view === 'resultat'}
        <ReportCompteResultatCard mode="realise" bind:editableBudget {...compResultatProps} />
        <ReportGraphiquesCard mode="realise" chargesData={chargesChartDataRealise} recettesData={recettesChartDataRealise} />
      {/if}

      {#if view === 'analytique'}
        <ReportAnalytiqueTab report={report} categories={categories} />
      {/if}

      {#if view === 'tresorerie'}
        <ReportTresorerieTab {report} {selectedSeason} {seasons} {canUseAi} />
      {/if}

      {#if view === 'budget'}
        <ReportCompteResultatCard mode="previsionnel" bind:editableBudget {...compResultatProps} />
        <ReportGraphiquesCard mode="previsionnel" chargesData={chargesChartDataPrevisionnel} recettesData={recettesChartDataPrevisionnel} />
      {/if}
    </div>
  </div>

  <!--
    IMPRESSION : sections dédiées, toujours montées mais cachées à l'écran.
    Indépendantes des onglets → l'impression est fiable (pas de page blanche).
    Le report-print.css n'affiche que la section correspondant à `printTarget`.
  -->
  <div class="print-area" aria-hidden="true">
    <div data-print-section="resultat">
      <ReportCompteResultatCard mode="realise" editableBudget={editableBudget} {...compResultatProps} />
    </div>
    <div data-print-section="graph-realise">
      <ReportGraphiquesCard mode="realise" chargesData={chargesChartDataRealise} recettesData={recettesChartDataRealise} />
    </div>
    <div data-print-section="graph-prev">
      <ReportGraphiquesCard mode="previsionnel" chargesData={chargesChartDataPrevisionnel} recettesData={recettesChartDataPrevisionnel} />
    </div>
  </div>
</div>
