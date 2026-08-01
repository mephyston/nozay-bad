<script lang="ts">
  import { tick } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { Tabs, Button, DropdownMenu } from '@nba/ui';
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
    report, prevReport = null, seasonId, seasons = [], categories = [], accountClasses = [], budget = []
  }: {
    report: ReportData; prevReport?: ReportData | null; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; accountClasses?: AccountClass[]; budget?: BudgetRecord[];
  } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  let activeTab = $state<'resultat' | 'analytique' | 'tresorerie' | 'budget'>('resultat');
  let editableBudget = $state<Record<string, number>>({});
  let isSaving = $state(false);
  let saveStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  function handleTabChange(newTab: string) {
    activeTab = newTab as 'resultat' | 'analytique' | 'tresorerie' | 'budget';
  }

  // Impression ciblée : on n'imprime qu'une seule section à la fois.
  type PrintTarget = 'resultat' | 'graph-realise' | 'graph-prev';
  let printTarget = $state<PrintTarget | null>(null);

  // Les sections imprimables vivent dans une zone dédiée (hors onglets), toujours
  // montée. On pose la cible, on laisse le DOM se peindre, puis on imprime.
  async function printSection(target: PrintTarget) {
    printTarget = target;
    await tick();
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  // La classe cible est retirée une fois la boîte d'impression fermée.
  $effect(() => {
    const clear = () => { printTarget = null; };
    window.addEventListener('afterprint', clear);
    return () => window.removeEventListener('afterprint', clear);
  });

  $effect(() => {
    const newMap: Record<string, number> = {};
    for (const item of budget as any[]) newMap[`${item.categoryId}_${item.type}`] = item.amountCents !== undefined ? item.amountCents / 100 : (item.amount || 0);
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
    try {
      const payload: BudgetRecord[] = Object.entries(editableBudget)
        .map(([key, amount]) => { const [catIdStr, type] = key.split('_'); return { categoryId: parseInt(catIdStr), type: type as 'recette' | 'depense', amount: Math.round((Number(amount) || 0) * 100) }; })
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

<div class="space-y-6 {printTarget ? `printing print-${printTarget}` : ''}">
  <!-- ÉCRAN : navigation par onglets (masquée à l'impression). -->
  <div class="report-screen">
    <Tabs.Root value={activeTab} onValueChange={handleTabChange} class="space-y-6">
      <!-- Onglets centrés + bouton d'impression aligné sur la même ligne, à droite. -->
      <div class="flex items-center gap-3 mb-6">
        <div class="hidden sm:block flex-1"></div>
        <Tabs.List class="w-full sm:w-fit justify-start sm:justify-center overflow-x-auto no-scrollbar">
          <Tabs.Trigger value="resultat">Compte de résultat</Tabs.Trigger>
          <Tabs.Trigger value="analytique">Suivi Analytique</Tabs.Trigger>
          <Tabs.Trigger value="tresorerie">Bilan de trésorerie</Tabs.Trigger>
          <Tabs.Trigger value="budget">Budget prévisionnel</Tabs.Trigger>
        </Tabs.List>
        <div class="flex-1 flex justify-end no-print">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Button {...props} class="h-9 gap-2">
                  Imprimer <ChevronDown class="w-4 h-4" />
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onclick={() => printSection('resultat')} class="font-medium cursor-pointer">Compte de résultat</DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => printSection('graph-realise')} class="font-medium cursor-pointer">Graphiques réalisés</DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => printSection('graph-prev')} class="font-medium cursor-pointer">Graphique prévisionnel</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <Tabs.Content value="resultat" class="space-y-6">
        <ReportCompteResultatCard mode="realise" bind:editableBudget {...compResultatProps} />
        <ReportGraphiquesCard mode="realise" chargesData={chargesChartDataRealise} recettesData={recettesChartDataRealise} />
      </Tabs.Content>

      <Tabs.Content value="analytique" class="space-y-6">
        <ReportAnalytiqueTab report={report} categories={categories} />
      </Tabs.Content>

      <Tabs.Content value="tresorerie" class="space-y-6">
        <ReportTresorerieTab {report} {selectedSeason} {seasons} />
      </Tabs.Content>

      <Tabs.Content value="budget" class="space-y-6">
        <ReportCompteResultatCard mode="previsionnel" bind:editableBudget {...compResultatProps} />
        <ReportGraphiquesCard mode="previsionnel" chargesData={chargesChartDataPrevisionnel} recettesData={recettesChartDataPrevisionnel} />
      </Tabs.Content>
    </Tabs.Root>
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
