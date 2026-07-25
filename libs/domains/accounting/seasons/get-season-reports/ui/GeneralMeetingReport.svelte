<script lang="ts">
  import { Tabs } from '@nba/ui';
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
  import './report-print.css';

  export * from './report-types';
  export * from './report-utils';
  export * from './report-constants';

  let {
    report, prevReport = null, seasonId, seasons = [], categories = [], accountClasses = [], budget = []
  }: {
    report: ReportData; prevReport?: ReportData | null; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; accountClasses?: AccountClass[]; budget?: BudgetRecord[];
  } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  let activeTab = $state<'resultat' | 'tresorerie' | 'budget'>('resultat');
  let editableBudget = $state<Record<string, number>>({});
  let isSaving = $state(false);
  let saveStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  function handleTabChange(newTab: string) {
    activeTab = newTab as 'resultat' | 'tresorerie' | 'budget';
  }

  $effect(() => {
    const newMap: Record<string, number> = {};
    for (const item of budget) newMap[`${item.categoryId}_${item.type}`] = item.amount;
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
    generatePieSlices(accountClasses.filter(ac => ac.type === 'depense').map(ac => ({ label: ac.label, value: getClassSumRealise(ac.code, 'depense', 'realise') })))
  );

  let recettesChartDataRealise = $derived(
    generatePieSlices(accountClasses.filter(ac => ac.type === 'recette').map(ac => ({ label: ac.label, value: getClassSumRealise(ac.code, 'recette', 'realise') })))
  );

  let chargesChartDataPrevisionnel = $derived(
    generatePieSlices(accountClasses.filter(ac => ac.type === 'depense').map(ac => ({ label: ac.label, value: getClassSumPrevisionnel(ac.code, 'depense') })))
  );

  let recettesChartDataPrevisionnel = $derived(
    generatePieSlices(accountClasses.filter(ac => ac.type === 'recette').map(ac => ({ label: ac.label, value: getClassSumPrevisionnel(ac.code, 'recette') })))
  );

  async function handleSaveBudget() {
    isSaving = true;
    saveStatus = null;
    try {
      const payload: BudgetRecord[] = Object.entries(editableBudget)
        .map(([key, amount]) => { const [catIdStr, type] = key.split('_'); return { categoryId: parseInt(catIdStr), type: type as 'recette' | 'depense', amount }; })
        .filter(item => !isNaN(item.categoryId));

      const res = await fetch(window.location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_budget', seasonId: selectedSeason, budget: payload })
      });

      if (res.ok) {
        saveStatus = { type: 'success', message: 'Budget prévisionnel enregistré avec succès !' };
        setTimeout(() => { saveStatus = null; }, 4000);
      } else {
        throw new Error(await res.text());
      }
    } catch (err: unknown) {
      saveStatus = { type: 'error', message: (err as any).message || "Impossible d'enregistrer le budget." };
    } finally {
      isSaving = false;
    }
  }

  const chargeClasses = $derived(accountClasses.length > 0 ? accountClasses.filter(ac => ac.type === 'depense') : defaultChargeClasses);
  const produitClasses = $derived(accountClasses.length > 0 ? accountClasses.filter(ac => ac.type === 'recette') : defaultProduitClasses);

  const compResultatProps = $derived({
    report, prevReport, selectedSeason, seasons, categories, chargeClasses, produitClasses,
    isClosed, isSaving, saveStatus, getClassCategories, getClassSumRealise, getClassSumPrevisionnel,
    getCatTotal, getTotalDepensesRealise, getTotalRecettesRealise, totalDepensesPrevisionnel,
    totalRecettesPrevisionnel, onSaveBudget: handleSaveBudget
  });
</script>

<div class="space-y-6">
  <Tabs.Root value={activeTab} onValueChange={handleTabChange} class="space-y-6">
    <Tabs.List class="grid w-full max-w-2xl mx-auto grid-cols-3 mb-6 no-print">
      <Tabs.Trigger value="resultat">Compte de résultat</Tabs.Trigger>
      <Tabs.Trigger value="tresorerie">Bilan de trésorerie</Tabs.Trigger>
      <Tabs.Trigger value="budget">Budget prévisionnel</Tabs.Trigger>
    </Tabs.List>

    <!-- Onglet 1 : « Compte de résultat » -->
    <Tabs.Content value="resultat" class="space-y-6">
      <ReportCompteResultatCard mode="realise" bind:editableBudget {...compResultatProps} />
      <ReportGraphiquesCard mode="realise" chargesData={chargesChartDataRealise} recettesData={recettesChartDataRealise} />
    </Tabs.Content>

    <!-- Onglet 2 : « Bilan de trésorerie » -->
    <Tabs.Content value="tresorerie" class="space-y-6">
      <ReportTresorerieTab {report} {selectedSeason} {seasons} />
    </Tabs.Content>

    <!-- Onglet 3 : « Budget prévisionnel » -->
    <Tabs.Content value="budget" class="space-y-6">
      <ReportCompteResultatCard mode="previsionnel" bind:editableBudget {...compResultatProps} />
      <ReportGraphiquesCard mode="previsionnel" chargesData={chargesChartDataPrevisionnel} recettesData={recettesChartDataPrevisionnel} />
    </Tabs.Content>
  </Tabs.Root>
</div>
