<script lang="ts">
  import { AlertCircle, Printer } from 'lucide-svelte';

  interface CategoryTotal {
    type: 'recette' | 'depense';
    total: number;
  }

  interface ReportData {
    compteResultat: {
      totalRecettes: number;
      totalDepenses: number;
      netResult: number;
      categories: Record<string, CategoryTotal>;
    };
    bilanTrésorerie: {
      accountId: 'current' | 'savings' | 'cash';
      initialBalance: number;
      finalBalance: number;
    }[];
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
    closed: boolean;
  }

  interface DbCategory {
    id: number;
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses: boolean;
    codeRecette?: string | null;
    codeDepense?: string | null;
  }

  interface AccountClass {
    code: string;
    label: string;
    type: 'recette' | 'depense';
  }

  interface BudgetRecord {
    categoryId: number;
    type: 'recette' | 'depense';
    amount: number;
  }

  let { report, prevReport = null, seasonId, seasons = [], categories = [], accountClasses = [], budget = [] }: { report: ReportData; prevReport?: ReportData | null; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; accountClasses?: AccountClass[]; budget?: BudgetRecord[] } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  let reportMode = $state<'realise' | 'previsionnel'>('realise');
  let editableBudget = $state<Record<string, number>>({});
  let isSaving = $state(false);
  let saveStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  function getPreviousSeasonId(currentId: string): string {
    const parts = currentId.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);
      if (!isNaN(start) && !isNaN(end)) {
        const prevStart = (start - 1).toString().padStart(2, '0');
        const prevEnd = (end - 1).toString().padStart(2, '0');
        return `${prevStart}-${prevEnd}`;
      }
    }
    return '';
  }

  $effect(() => {
    const newMap: Record<string, number> = {};
    for (const item of budget) {
      newMap[`${item.categoryId}_${item.type}`] = item.amount;
    }
    for (const cat of categories) {
      if (cat.codeRecette) {
        const key = `${cat.id}_recette`;
        if (newMap[key] === undefined) newMap[key] = 0;
      }
      if (cat.codeDepense) {
        const key = `${cat.id}_depense`;
        if (newMap[key] === undefined) newMap[key] = 0;
      }
    }
    editableBudget = newMap;
  });

  // Helper to get categories matching a class code and flow type
  function getClassCategories(classCode: string, type: 'recette' | 'depense'): DbCategory[] {
    return categories.filter(cat => {
      const code = type === 'recette' ? cat.codeRecette : cat.codeDepense;
      return code === classCode;
    });
  }

  // Get total for a class code and flow type (realise)
  function getClassSumRealise(classCode: string, type: 'recette' | 'depense'): number {
    const classCats = getClassCategories(classCode, type);
    let sum = 0;
    for (const cat of classCats) {
      sum += getCatTotal(cat.id.toString(), type);
    }
    return sum;
  }

  // Get total for a class code and flow type (previsionnel)
  function getClassSumPrevisionnel(classCode: string, type: 'recette' | 'depense'): number {
    const classCats = getClassCategories(classCode, type);
    return classCats.reduce((sum, cat) => sum + (editableBudget[`${cat.id}_${type}`] || 0), 0);
  }

  // Get total for a class code and flow type (dynamic based on reportMode)
  function getClassSum(classCode: string, type: 'recette' | 'depense'): number {
    return reportMode === 'realise'
      ? getClassSumRealise(classCode, type)
      : getClassSumPrevisionnel(classCode, type);
  }

  let totalDepensesRealise = $derived(
    accountClasses
      .filter(ac => ac.type === 'depense')
      .reduce((sum, ac) => sum + getClassSumRealise(ac.code, 'depense'), 0)
  );

  let totalDepensesPrevisionnel = $derived(
    accountClasses
      .filter(ac => ac.type === 'depense')
      .reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'depense'), 0)
  );

  let totalRecettesRealise = $derived(
    accountClasses
      .filter(ac => ac.type === 'recette')
      .reduce((sum, ac) => sum + getClassSumRealise(ac.code, 'recette'), 0)
  );

  let totalRecettesPrevisionnel = $derived(
    accountClasses
      .filter(ac => ac.type === 'recette')
      .reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'recette'), 0)
  );

  let netResultRealise = $derived(totalRecettesRealise - totalDepensesRealise);
  let netResultPrevisionnel = $derived(totalRecettesPrevisionnel - totalDepensesPrevisionnel);

  // Backward compatibility for standard variables
  let totalDepenses = $derived(reportMode === 'realise' ? totalDepensesRealise : totalDepensesPrevisionnel);
  let totalRecettes = $derived(reportMode === 'realise' ? totalRecettesRealise : totalRecettesPrevisionnel);
  let netResult = $derived(reportMode === 'realise' ? netResultRealise : netResultPrevisionnel);

  let isClosed = $derived(
    seasons.find(s => s.id === selectedSeason)?.closed || false
  );

  // Generate vector SVG pie chart slices
  function generatePieSlices(items: { label: string; value: number }[]) {
    const validItems = items.filter(item => item.value > 0);
    const total = validItems.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];

    let accumulatedPercent = 0;
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'
    ];

    return validItems.map((item, index) => {
      const percent = item.value / total;
      const startAngle = accumulatedPercent * 2 * Math.PI;
      accumulatedPercent += percent;
      const endAngle = accumulatedPercent * 2 * Math.PI;

      const r = 80;
      const cx = 100;
      const cy = 100;
      
      const x1 = cx + r * Math.sin(startAngle);
      const y1 = cy - r * Math.cos(startAngle);
      const x2 = cx + r * Math.sin(endAngle);
      const y2 = cy - r * Math.cos(endAngle);

      const largeArcFlag = percent > 0.5 ? 1 : 0;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return {
        label: item.label,
        value: item.value,
        percent: (percent * 100).toFixed(1),
        pathData,
        color: colors[index % colors.length]
      };
    });
  }

  let chargesChartData = $derived(
    generatePieSlices(
      accountClasses
        .filter(ac => ac.type === 'depense')
        .map(ac => ({
          label: ac.label,
          value: reportMode === 'realise' ? getClassSumRealise(ac.code, 'depense') : getClassSumPrevisionnel(ac.code, 'depense')
        }))
    )
  );

  let recettesChartData = $derived(
    generatePieSlices(
      accountClasses
        .filter(ac => ac.type === 'recette')
        .map(ac => ({
          label: ac.label,
          value: reportMode === 'realise' ? getClassSumRealise(ac.code, 'recette') : getClassSumPrevisionnel(ac.code, 'recette')
        }))
    )
  );

  async function handleSaveBudget() {
    isSaving = true;
    saveStatus = null;
    try {
      const payload: BudgetRecord[] = Object.entries(editableBudget).map(([key, amount]) => {
        const [catIdStr, type] = key.split('_');
        return {
          categoryId: parseInt(catIdStr),
          type: type as 'recette' | 'depense',
          amount
        };
      }).filter(item => !isNaN(item.categoryId));

      const res = await fetch(window.location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_budget',
          seasonId: selectedSeason,
          budget: payload
        })
      });

      if (res.ok) {
        saveStatus = { type: 'success', message: 'Budget prévisionnel enregistré avec succès !' };
        setTimeout(() => {
          saveStatus = null;
        }, 4000);
      } else {
        const errText = await res.text();
        throw new Error(errText);
      }
    } catch (err: any) {
      saveStatus = { type: 'error', message: err.message || "Impossible d'enregistrer le budget." };
    } finally {
      isSaving = false;
    }
  }

  const legacyCategoryLabels: Record<string, string> = {
    adhesions: 'Adhésions / Inscriptions membres',
    partenariats: 'Partenariats / Sponsoring',
    subventions: 'Subventions publiques',
    buvette: 'Ventes buvette',
    boutique: 'Ventes boutique',
    evenements: 'Inscriptions événements',
    stages: 'Stages',
    divers_recette: 'Autres recettes',
    salaires: 'Salaires & Charges',
    achats_boutique: 'Achats matériels (revente)',
    achats_club: 'Achats matériels club',
    licences_ffbad: 'Reversement licences FFBad',
    championnats: 'Inscriptions Championnats',
    formations: 'Formations',
    evenements_club: 'Dépenses Événements',
    frais_deplacement: 'Notes de frais bénévoles',
    assurances: 'Assurances',
    frais_administratifs: 'Frais Admin / Banque',
    divers_depense: 'Autres dépenses'
  };

  function getCategoryLabel(key: string): string {
    const id = parseInt(key);
    if (!isNaN(id)) {
      const found = categories.find(c => c.id === id);
      if (found) {
        return found.adminLabel;
      }
    }
    return legacyCategoryLabels[key] || key;
  }

  function formatAmount(cents: number): string {
    const euros = cents / 100;
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(euros);
    return formatted.replace(/\s/g, '\u00a0') + '\u00a0€';
  }

  function formatDelta(cents: number): string {
    const sign = cents >= 0 ? '+' : '';
    return sign + formatAmount(cents);
  }

  const accountLabels = {
    current: 'Compte Courant',
    savings: 'Compte Livret',
    cash: 'Caisse Physique'
  };

  function applySeasonChange() {
    const params = new URLSearchParams(window.location.search);
    params.set('season', selectedSeason);
    window.location.href = `/admin/compta/reports?${params.toString()}`;
  }

  // Helper to safely get total for a category and type
  function getCatTotal(id: string, type: 'recette' | 'depense'): number {
    const reportToUse = (reportMode === 'previsionnel' && prevReport) ? prevReport : report;
    return reportToUse.compteResultat.categories[`${id}_${type}`]?.total || 0;
  }


  function getClassItems(classCode: string, type: 'recette' | 'depense'): { label: string, total: number }[] {
    const items: { label: string, total: number }[] = [];
    for (const cat of categories) {
      const code = type === 'recette' ? cat.codeRecette : cat.codeDepense;
      if (code === classCode) {
        const total = getCatTotal(cat.id.toString(), type);
        if (total > 0) {
          items.push({
            label: cat.adminLabel,
            total
          });
        }
      }
    }
    return items;
  }

  const chargeClasses = $derived(
    accountClasses.length > 0
      ? accountClasses.filter(ac => ac.type === 'depense')
      : [
          { code: '60', label: '60 - Achats' },
          { code: '61', label: '61 - Services extérieurs' },
          { code: '62', label: '62 - Autres services extérieurs' },
          { code: '64', label: '64 - Charges de personnel' },
          { code: '65', label: '65 - Autres charges de gestion courante' },
          { code: '67', label: '67 - Charges exceptionnelles' }
        ]
  );

  const produitClasses = $derived(
    accountClasses.length > 0
      ? accountClasses.filter(ac => ac.type === 'recette')
      : [
          { code: '70', label: '70 - Vente de produits & prestations' },
          { code: '74', label: '74 - Subventions d\'exploitation' },
          { code: '75', label: '75 - Autres produits de gestion courante' },
          { code: '77', label: '77 - Produits exceptionnels' }
        ]
  );
</script>

<div class="space-y-8">
  <div class="flex items-center justify-between border-b border-border pb-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold tracking-tight">Rapport Financier pour l'Assemblée Générale</h2>
      <select
        class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary font-medium no-print"
        bind:value={selectedSeason}
        onchange={applySeasonChange}
      >
        {#each seasons as season}
          <option value={season.id}>{season.name}</option>
        {/each}
        {#if seasons.length === 0}
          <option value="25-26">Saison 2025-2026</option>
        {/if}
      </select>
    </div>
    
    <button
      type="button"
      onclick={() => window.print()}
      class="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs shadow-sm cursor-pointer flex items-center gap-1.5 no-print"
    >
      <Printer class="w-4 h-4" />
      Imprimer
    </button>
  </div>

  <!-- 1. COMPTE DE RÉSULTAT (PAGE 1) -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 print-container">
    <div class="flex items-center justify-between border-b border-border pb-4 no-print">
      <h3 class="text-lg font-semibold">1. Compte de Résultat</h3>
      <div class="inline-flex rounded-lg border border-border p-1 bg-muted/50">
        <button
          type="button"
          class="px-3 py-1 text-xs font-semibold rounded-md transition-colors {reportMode === 'realise' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => reportMode = 'realise'}
        >
          Réalisé
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs font-semibold rounded-md transition-colors {reportMode === 'previsionnel' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => reportMode = 'previsionnel'}
        >
          Prévisionnel
        </button>
      </div>
    </div>

    <!-- Printable Title for A4 -->
    <div class="hidden print:block text-center space-y-1 mb-6">
      <h3 class="text-xl font-bold tracking-tight">Compte de Résultat Simplifié</h3>
      <p class="text-xs text-muted-foreground">Saison {seasons.find(s => s.id === selectedSeason)?.name || selectedSeason}</p>
    </div>

    <div class="grid gap-6 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
      <!-- CHARGES (Dépenses) -->
      <div class="space-y-4 pr-0 md:pr-6 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
            <span class="text-sm font-bold text-destructive">CHARGES (Dépenses)</span>
            <div class="flex gap-8 font-mono text-[11px]">
              <span class="w-20 text-right">
                {#if reportMode === 'previsionnel' && prevReport}
                  Réalisé {seasons.find(s => s.id === getPreviousSeasonId(selectedSeason))?.name.replace('Saison ', '') || getPreviousSeasonId(selectedSeason)}
                {:else}
                  Réalisé
                {/if}
              </span>
              <span class="w-20 text-right">Prévisionnel</span>
            </div>
          </div>
          
          <div class="space-y-4 mt-4">
            {#each chargeClasses as cc}
              {#if reportMode === 'previsionnel' || getClassSumRealise(cc.code, 'depense') > 0 || getClassSumPrevisionnel(cc.code, 'depense') > 0}
                <div class="space-y-1.5 py-1 {getClassSumRealise(cc.code, 'depense') === 0 && getClassSumPrevisionnel(cc.code, 'depense') === 0 ? 'print:hidden' : ''}">
                  <div class="flex justify-between items-center text-sm border-b border-border/40 pb-1 font-bold text-foreground">
                    <a href="/admin/compta?season={selectedSeason}&classCode={cc.code}" class="hover:underline hover:text-primary transition-colors cursor-pointer text-foreground/90 print:no-underline" title="Voir les écritures dans le grand livre">{cc.label}</a>
                    <div class="flex gap-8 font-mono">
                      <span class="w-20 text-right">{formatAmount(getClassSumRealise(cc.code, 'depense'))}</span>
                      <span class="w-20 text-right">{formatAmount(getClassSumPrevisionnel(cc.code, 'depense'))}</span>
                    </div>
                  </div>
                  
                  <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                    {#each getClassCategories(cc.code, 'depense') as cat}
                      {#if reportMode === 'previsionnel' || getCatTotal(cat.id.toString(), 'depense') > 0 || (editableBudget[`${cat.id}_depense`] || 0) > 0}
                        <div class="flex justify-between items-center py-0.5 font-mono text-[11px] {getCatTotal(cat.id.toString(), 'depense') === 0 && (editableBudget[`${cat.id}_depense`] || 0) === 0 ? 'print:hidden' : ''}">
                          <a href="/admin/compta?season={selectedSeason}&category={cat.id}" class="font-sans text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer print:no-underline" title="Voir les écritures de cette catégorie dans le grand livre">• {cat.adminLabel}</a>
                          <div class="flex gap-8 items-center">
                            <span class="w-20 text-right">{formatAmount(getCatTotal(cat.id.toString(), 'depense'))}</span>
                            {#if reportMode === 'previsionnel' && !isClosed}
                              <div class="relative flex items-center w-20">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={editableBudget[`${cat.id}_depense`] !== undefined ? (editableBudget[`${cat.id}_depense`] / 100) : ''}
                                  oninput={(e) => {
                                    const val = parseFloat(e.currentTarget.value) || 0;
                                    editableBudget[`${cat.id}_depense`] = Math.round(val * 100);
                                  }}
                                  class="w-20 px-1 py-0.5 text-right border border-border bg-background rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium font-mono no-print"
                                />
                                <span class="absolute right-1 text-[10px] text-muted-foreground pointer-events-none no-print">€</span>
                                <span class="hidden print:inline font-mono text-right w-full">{formatAmount(editableBudget[`${cat.id}_depense`] || 0)}</span>
                              </div>
                            {:else}
                              <span class="w-20 text-right">{formatAmount(editableBudget[`${cat.id}_depense`] || 0)}</span>
                            {/if}
                          </div>
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-border space-y-2 font-bold text-sm">
          {#if netResultRealise >= 0 || netResultPrevisionnel >= 0}
            <div class="flex justify-between font-semibold text-xs text-emerald-600 dark:text-emerald-400">
              <span>Excédent de l'exercice (Bénéfice)</span>
              <div class="flex gap-8 font-mono">
                <span class="w-20 text-right">{netResultRealise >= 0 ? formatAmount(netResultRealise) : formatAmount(0)}</span>
                <span class="w-20 text-right">{netResultPrevisionnel >= 0 ? formatAmount(netResultPrevisionnel) : formatAmount(0)}</span>
              </div>
            </div>
          {/if}
          <div class="flex justify-between text-foreground">
            <span>TOTAL GÉNÉRAL</span>
            <div class="flex gap-8 font-mono">
              <span class="w-20 text-right">{formatAmount(netResultRealise >= 0 ? totalDepensesRealise + netResultRealise : totalDepensesRealise)}</span>
              <span class="w-20 text-right">{formatAmount(netResultPrevisionnel >= 0 ? totalDepensesPrevisionnel + netResultPrevisionnel : totalDepensesPrevisionnel)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PRODUITS (Recettes) -->
      <div class="space-y-4 pl-0 md:pl-6 pt-6 md:pt-0 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
            <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">PRODUITS (Recettes)</span>
            <div class="flex gap-8 font-mono text-[11px]">
              <span class="w-20 text-right">
                {#if reportMode === 'previsionnel' && prevReport}
                  Réalisé {seasons.find(s => s.id === getPreviousSeasonId(selectedSeason))?.name.replace('Saison ', '') || getPreviousSeasonId(selectedSeason)}
                {:else}
                  Réalisé
                {/if}
              </span>
              <span class="w-20 text-right">Prévisionnel</span>
            </div>
          </div>
          
          <div class="space-y-4 mt-4">
            {#each produitClasses as pc}
              {#if reportMode === 'previsionnel' || getClassSumRealise(pc.code, 'recette') > 0 || getClassSumPrevisionnel(pc.code, 'recette') > 0}
                <div class="space-y-1.5 py-1 {getClassSumRealise(pc.code, 'recette') === 0 && getClassSumPrevisionnel(pc.code, 'recette') === 0 ? 'print:hidden' : ''}">
                  <div class="flex justify-between items-center text-sm border-b border-border/40 pb-1 font-bold text-foreground">
                    <a href="/admin/compta?season={selectedSeason}&classCode={pc.code}" class="hover:underline hover:text-primary transition-colors cursor-pointer text-foreground/90 print:no-underline" title="Voir les écritures dans le grand livre">{pc.label}</a>
                    <div class="flex gap-8 font-mono">
                      <span class="w-20 text-right">{formatAmount(getClassSumRealise(pc.code, 'recette'))}</span>
                      <span class="w-20 text-right">{formatAmount(getClassSumPrevisionnel(pc.code, 'recette'))}</span>
                    </div>
                  </div>
                  
                  <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                    {#each getClassCategories(pc.code, 'recette') as cat}
                      {#if reportMode === 'previsionnel' || getCatTotal(cat.id.toString(), 'recette') > 0 || (editableBudget[`${cat.id}_recette`] || 0) > 0}
                        <div class="flex justify-between items-center py-0.5 font-mono text-[11px] {getCatTotal(cat.id.toString(), 'recette') === 0 && (editableBudget[`${cat.id}_recette`] || 0) === 0 ? 'print:hidden' : ''}">
                          <a href="/admin/compta?season={selectedSeason}&category={cat.id}" class="font-sans text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer print:no-underline" title="Voir les écritures de cette catégorie dans le grand livre">• {cat.adminLabel}</a>
                          <div class="flex gap-8 items-center">
                            <span class="w-20 text-right">{formatAmount(getCatTotal(cat.id.toString(), 'recette'))}</span>
                            {#if reportMode === 'previsionnel' && !isClosed}
                              <div class="relative flex items-center w-20">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={editableBudget[`${cat.id}_recette`] !== undefined ? (editableBudget[`${cat.id}_recette`] / 100) : ''}
                                  oninput={(e) => {
                                    const val = parseFloat(e.currentTarget.value) || 0;
                                    editableBudget[`${cat.id}_recette`] = Math.round(val * 100);
                                  }}
                                  class="w-20 px-1 py-0.5 text-right border border-border bg-background rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium font-mono no-print"
                                />
                                <span class="absolute right-1 text-[10px] text-muted-foreground pointer-events-none no-print">€</span>
                                <span class="hidden print:inline font-mono text-right w-full">{formatAmount(editableBudget[`${cat.id}_recette`] || 0)}</span>
                              </div>
                            {:else}
                              <span class="w-20 text-right">{formatAmount(editableBudget[`${cat.id}_recette`] || 0)}</span>
                            {/if}
                          </div>
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-border space-y-2 font-bold text-sm">
          {#if netResultRealise < 0 || netResultPrevisionnel < 0}
            <div class="flex justify-between font-semibold text-xs text-destructive">
              <span>Déficit de l'exercice (Perte)</span>
              <div class="flex gap-8 font-mono">
                <span class="w-20 text-right">{netResultRealise < 0 ? formatAmount(-netResultRealise) : formatAmount(0)}</span>
                <span class="w-20 text-right">{netResultPrevisionnel < 0 ? formatAmount(-netResultPrevisionnel) : formatAmount(0)}</span>
              </div>
            </div>
          {/if}
          <div class="flex justify-between text-foreground">
            <span>TOTAL GÉNÉRAL</span>
            <div class="flex gap-8 font-mono">
              <span class="w-20 text-right">{formatAmount(netResultRealise < 0 ? totalRecettesRealise + (-netResultRealise) : totalRecettesRealise)}</span>
              <span class="w-20 text-right">{formatAmount(netResultPrevisionnel < 0 ? totalRecettesPrevisionnel + (-netResultPrevisionnel) : totalRecettesPrevisionnel)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions / Feedback for Budget editing -->
    {#if reportMode === 'previsionnel' && !isClosed}
      <div class="flex flex-col gap-3 pt-4 border-t border-border mt-6 no-print">
        {#if saveStatus}
          <div class="p-3 text-xs rounded-lg {saveStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}">
            {saveStatus.message}
          </div>
        {/if}
        
        <div class="flex justify-end">
          <button
            type="button"
            onclick={handleSaveBudget}
            disabled={isSaving}
            class="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {#if isSaving}
              Enregistrement...
            {:else}
              Enregistrer le Prévisionnel
            {/if}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- DIAGRAMMES (PAGE 2) -->
  <div class="page-break bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
    <div class="text-center space-y-1 mb-2">
      <h3 class="text-lg font-bold tracking-tight">2. Répartition Graphique des Budgets</h3>
      <p class="text-xs text-muted-foreground">Représentation par classes de comptes (Mode : {reportMode === 'realise' ? 'Réalisé' : 'Prévisionnel'})</p>
    </div>
    
    <div class="grid md:grid-cols-2 gap-8">
      <!-- Charges Chart -->
      <div class="border border-border/80 rounded-xl p-6 flex flex-col items-center justify-between bg-muted/20">
        <h4 class="font-bold text-sm text-destructive mb-6 text-center">Charges (Dépenses)</h4>
        {#if chargesChartData.length > 0}
          <div class="flex flex-col items-center gap-6 w-full">
            <svg width="180" height="180" viewBox="0 0 200 200" class="drop-shadow-sm rotate-[-90deg]">
              {#each chargesChartData as slice}
                <path d={slice.pathData} fill={slice.color} class="hover:opacity-90 transition-opacity" />
              {/each}
            </svg>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs pt-4 border-t border-border/60">
              {#each chargesChartData as slice}
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
                  <span class="truncate text-foreground/80 font-medium" title={slice.label}>{slice.label} : <strong class="font-mono">{slice.percent}%</strong></span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-xs text-muted-foreground italic my-8">Aucune charge à afficher.</p>
        {/if}
      </div>

      <!-- Recettes Chart -->
      <div class="border border-border/80 rounded-xl p-6 flex flex-col items-center justify-between bg-muted/20">
        <h4 class="font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-6 text-center">Produits (Recettes)</h4>
        {#if recettesChartData.length > 0}
          <div class="flex flex-col items-center gap-6 w-full">
            <svg width="180" height="180" viewBox="0 0 200 200" class="drop-shadow-sm rotate-[-90deg]">
              {#each recettesChartData as slice}
                <path d={slice.pathData} fill={slice.color} class="hover:opacity-90 transition-opacity" />
              {/each}
            </svg>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs pt-4 border-t border-border/60">
              {#each recettesChartData as slice}
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
                  <span class="truncate text-foreground/80 font-medium" title={slice.label}>{slice.label} : <strong class="font-mono">{slice.percent}%</strong></span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-xs text-muted-foreground italic my-8">Aucune recette à afficher.</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- 2. BILAN DE TRÉSORERIE (no-print) -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 no-print">
    <h3 class="text-lg font-semibold">2. Bilan de Trésorerie</h3>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
          <tr>
            <th class="p-4">Compte Financier</th>
            <th class="p-4 text-right">Solde Initial (1er sept.)</th>
            <th class="p-4 text-right">Mouvements de saison</th>
            <th class="p-4 text-right">Solde Réel Final (31 août)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each report.bilanTrésorerie as item}
            <tr>
              <td class="p-4 font-semibold">{accountLabels[item.accountId]}</td>
              <td class="p-4 text-right">{formatAmount(item.initialBalance)}</td>
              <td class="p-4 text-right font-medium {item.finalBalance - item.initialBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}">
                {formatDelta(item.finalBalance - item.initialBalance)}
              </td>
              <td class="p-4 text-right font-bold">{formatAmount(item.finalBalance)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  @media print {
    @page {
      size: landscape;
      margin: 0.8cm;
    }
    :global(body) {
      background: white !important;
      color: black !important;
      font-size: 10px !important;
    }
    :global(aside), :global(nav), :global(header) {
      display: none !important;
    }
    /* Strip Astro layouts padding/margin */
    :global(main), :global(.px-6), :global(.py-8), :global(.container), :global(.mx-auto), :global(.max-w-7xl) {
      padding: 0 !important;
      margin: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
    }
    .no-print {
      display: none !important;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
      margin-top: 0 !important;
      padding-top: 1.5rem !important;
      border: none !important;
      box-shadow: none !important;
    }
    .bg-card {
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 0 !important;
    }
    .print-container {
      width: 100% !important;
      max-width: 100% !important;
    }
    /* Compact layout adjustments to ensure exactly 1 page */
    .print-container .grid {
      gap: 1rem !important;
    }
    .print-container .space-y-4 {
      margin-top: 0.3rem !important;
    }
    .print-container .py-1 {
      padding-top: 0.1rem !important;
      padding-bottom: 0.1rem !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }
    .print-container :global(h4) {
      font-size: 12px !important;
      padding-bottom: 0.25rem !important;
    }
    .print-container .text-sm {
      font-size: 11px !important;
    }
    .print-container .text-xs, .print-container .text-\[11px\] {
      font-size: 9.5px !important;
    }
    .print-container .mt-8 {
      margin-top: 1rem !important;
    }
    .print-container .pt-4 {
      padding-top: 0.5rem !important;
    }
  }
</style>
