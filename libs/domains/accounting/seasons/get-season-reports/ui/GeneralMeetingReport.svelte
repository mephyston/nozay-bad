<script lang="ts">
  import { tick } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { Tabs, Button, DropdownMenu, submitForm, uiConfirm, readApiError } from '@nba/ui';
  import type { ReportData, Season, DbCategory, AccountClass, BudgetRecord } from './report-types';
  import { generatePieSlices } from './report-utils';
  import { defaultChargeClasses, defaultProduitClasses } from './report-constants';
  import {
    getClassCategories as calcGetClassCategories,
    getCatTotal as calcGetCatTotal,
    getClassSumRealise as calcGetClassSumRealise,
    getClassSumPrevisionnel as calcGetClassSumPrevisionnel,
    getTotalDepensesRealise as calcGetTotalDepensesRealise,
    getTotalRecettesRealise as calcGetTotalRecettesRealise,
  UNCLASSIFIED_CLASS_CODE,
  UNCLASSIFIED_CLASS_LABEL
} from './report-calculations';
  import ReportTresorerieTab from './ReportTresorerieTab.svelte';
  import ReportGraphiquesCard from './ReportGraphiquesCard.svelte';
  import ReportCompteResultatCard from './ReportCompteResultatCard.svelte';
  import ReportAnalytiqueTab from './ReportAnalytiqueTab.svelte';
  import './report-print.css';

  let {
    view, report, prevReport = null, seasonId, seasons = [], categories = [], accountClasses = [], budget = [], canUseAi = false, pdfDoc = ''
  }: {
    view: 'resultat' | 'analytique' | 'tresorerie' | 'budget';
    report: ReportData; prevReport?: ReportData | null; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; accountClasses?: AccountClass[]; budget?: BudgetRecord[]; canUseAi?: boolean;
    /** Clé du document PDF sur `/admin/api/accounting/download` ; vide = pas de PDF. */
    pdfDoc?: string;
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

  /*
   * Rapport en PDF (en-tête et pied de page du club), servi « inline » : il s'ouvre dans
   * un nouvel onglet plutôt que d'être téléchargé.
   *
   * L'adresse était déduite du chemin courant, ce qui liait ce composant à la page qui
   * l'affiche. Elle est désormais nommée — et `pdfDoc` vaut la chaîne vide là où aucun
   * PDF n'existe : sur le budget prévisionnel, le bouton rouvrait simplement la page dans
   * un onglet, ce que personne n'attendait d'un bouton « PDF ».
   */
  function openPdf() {
    if (!pdfDoc) return;
    const adresse = `/admin/api/accounting/download?doc=${encodeURIComponent(pdfDoc)}&season=${encodeURIComponent(selectedSeason)}`;
    window.open(adresse, '_blank');
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

  const getClassCategories = (code: string, type: 'recette' | 'depense') => calcGetClassCategories(categories, code, type, accountClasses, report);
  const getCatTotal = (id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => calcGetCatTotal(report, prevReport, id, type, mode);
  const getClassSumRealise = (code: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => calcGetClassSumRealise(categories, report, prevReport, code, type, mode, accountClasses);
  const getClassSumPrevisionnel = (code: string, type: 'recette' | 'depense') => calcGetClassSumPrevisionnel(categories, editableBudget, code, type, accountClasses);
  const getTotalDepensesRealise = (mode: 'realise' | 'previsionnel') => calcGetTotalDepensesRealise(accountClasses, categories, report, prevReport, mode);
  const getTotalRecettesRealise = (mode: 'realise' | 'previsionnel') => calcGetTotalRecettesRealise(accountClasses, categories, report, prevReport, mode);

  // Le budget d'une catégorie non ventilée compte aussi : sinon l'écart au budget mentirait.
  let totalDepensesPrevisionnel = $derived(
    accountClasses.filter(ac => ac.type === 'depense').reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'depense'), 0)
      + getClassSumPrevisionnel(UNCLASSIFIED_CLASS_CODE, 'depense')
  );

  let totalRecettesPrevisionnel = $derived(
    accountClasses.filter(ac => ac.type === 'recette').reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'recette'), 0)
      + getClassSumPrevisionnel(UNCLASSIFIED_CLASS_CODE, 'recette')
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

    /*
     * Garde-fou contre l'effacement accidentel du prévisionnel entier.
     *
     * Deux mécaniques se combinent mal. Le formulaire envoie **toutes** les catégories à
     * chaque enregistrement, en remplissant à zéro celles qu'il ne connaît pas ; et
     * l'API supprime toutes les lignes de la saison avant de réinsérer ce qu'elle reçoit.
     * Une sauvegarde déclenchée pendant que le budget n'est pas encore chargé écrase donc
     * l'ensemble par des zéros, sans que rien ne l'annonce — c'est arrivé.
     *
     * On ne l'interdit pas : tout remettre à zéro peut être voulu en début de saison. On
     * demande de le confirmer, ce qui suffit à distinguer l'intention de l'accident.
     */
    const avaitDesValeurs = (budget as any[]).some((b) => (b.amountCents ?? b.amount ?? 0) > 0);
    const toutAZero = payload.length > 0 && payload.every((item) => item.amount === 0);
    if (avaitDesValeurs && toutAZero) {
      const confirme = await uiConfirm({
        title: 'Remettre tout le budget à zéro ?',
        description:
          "Toutes les lignes du prévisionnel de cette saison passeraient à zéro, et les montants actuels seraient perdus. Si vous ne vouliez modifier qu'une ligne, annulez et rechargez la page : le budget n'était probablement pas encore chargé.",
        confirmLabel: 'Tout remettre à zéro',
        destructive: true
      });
      if (!confirme) {
        isSaving = false;
        return;
      }
    }

    await submitForm({
      submit: async () => {
        /*
          Le relais, et non `window.location.pathname`.

          Viser la page hôte a fait échouer l'enregistrement en silence : la page ne porte
          plus de gestionnaire POST, Astro y répond en rendant son HTML avec un 200, et un
          code qui ne teste que `res.ok` annonçait donc un succès pour une écriture qui
          n'avait pas eu lieu. Un 404 aurait au moins parlé.
        */
        const res = await fetch('/admin/api/accounting/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_budget', seasonId: selectedSeason, budget: payload })
        });
        if (!res.ok) throw new Error(await readApiError(res, "Impossible d'enregistrer le budget."));
      },
      // Le réaffichage recalcule la comparaison réalisé / prévisionnel.
      success: 'Budget prévisionnel enregistré.',
      onError: (message) => { saveStatus = { type: 'error', message }; }
    });

    isSaving = false;
  }

  /*
   * La pseudo-classe « Non ventilé » ferme chaque colonne.
   *
   * Elle ne vient pas de `account_classes` : elle recueille ce qu'aucune classe ne réclame — une
   * catégorie sans classe de ce côté, ou une écriture sans catégorie. Sans elle, ces montants
   * pesaient sur le bilan analytique et disparaissaient du compte de résultat, qui annonçait donc
   * un résultat différent. Les colonnes la masquent d'elles-mêmes quand elle vaut zéro.
   */
  const unclassifiedClass = (type: 'recette' | 'depense'): AccountClass =>
    ({ code: UNCLASSIFIED_CLASS_CODE, label: UNCLASSIFIED_CLASS_LABEL, type }) as AccountClass;

  const chargeClasses = $derived([
    ...(accountClasses.length > 0 ? accountClasses.filter(ac => ac.type === 'depense') : defaultChargeClasses),
    unclassifiedClass('depense')
  ]);
  const produitClasses = $derived([
    ...(accountClasses.length > 0 ? accountClasses.filter(ac => ac.type === 'recette') : defaultProduitClasses),
    unclassifiedClass('recette')
  ]);

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
