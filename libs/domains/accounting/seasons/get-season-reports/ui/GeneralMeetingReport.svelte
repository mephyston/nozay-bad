<script lang="ts">
  import { Button, Table, Input, Card, Tabs } from '@nba/ui';

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
    receiptCode?: string | null;
    expenseCode?: string | null;
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
  let activeTab = $state<'resultat' | 'tresorerie' | 'budget'>('resultat');
  let reportMode = $derived(activeTab === 'budget' ? 'previsionnel' : 'realise');
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
      if (cat.receiptCode) {
        const key = `${cat.id}_recette`;
        if (newMap[key] === undefined) newMap[key] = 0;
      }
      if (cat.expenseCode) {
        const key = `${cat.id}_depense`;
        if (newMap[key] === undefined) newMap[key] = 0;
      }
    }
    editableBudget = newMap;
  });

  // Helper to get categories matching a class code and flow type
  function getClassCategories(classCode: string, type: 'recette' | 'depense'): DbCategory[] {
    return categories.filter(cat => {
      const code = type === 'recette' ? cat.receiptCode : cat.expenseCode;
      return code === classCode;
    });
  }

  // Get total for a class code and flow type (realise)
  function getClassSumRealise(classCode: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel'): number {
    const classCats = getClassCategories(classCode, type);
    let sum = 0;
    for (const cat of classCats) {
      sum += getCatTotal(cat.id.toString(), type, mode);
    }
    return sum;
  }

  // Get total for a class code and flow type (previsionnel)
  function getClassSumPrevisionnel(classCode: string, type: 'recette' | 'depense'): number {
    const classCats = getClassCategories(classCode, type);
    return classCats.reduce((sum, cat) => sum + (editableBudget[`${cat.id}_${type}`] || 0), 0);
  }

  function getTotalDepensesRealise(mode: 'realise' | 'previsionnel'): number {
    return accountClasses
      .filter(ac => ac.type === 'depense')
      .reduce((sum, ac) => sum + getClassSumRealise(ac.code, 'depense', mode), 0);
  }

  function getTotalRecettesRealise(mode: 'realise' | 'previsionnel'): number {
    return accountClasses
      .filter(ac => ac.type === 'recette')
      .reduce((sum, ac) => sum + getClassSumRealise(ac.code, 'recette', mode), 0);
  }

  let totalDepensesPrevisionnel = $derived(
    accountClasses
      .filter(ac => ac.type === 'depense')
      .reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'depense'), 0)
  );

  let totalRecettesPrevisionnel = $derived(
    accountClasses
      .filter(ac => ac.type === 'recette')
      .reduce((sum, ac) => sum + getClassSumPrevisionnel(ac.code, 'recette'), 0)
  );

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

  let chargesChartDataRealise = $derived(
    generatePieSlices(
      accountClasses
        .filter(ac => ac.type === 'depense')
        .map(ac => ({
          label: ac.label,
          value: getClassSumRealise(ac.code, 'depense', 'realise')
        }))
    )
  );

  let recettesChartDataRealise = $derived(
    generatePieSlices(
      accountClasses
        .filter(ac => ac.type === 'recette')
        .map(ac => ({
          label: ac.label,
          value: getClassSumRealise(ac.code, 'recette', 'realise')
        }))
    )
  );

  let chargesChartDataPrevisionnel = $derived(
    generatePieSlices(
      accountClasses
        .filter(ac => ac.type === 'depense')
        .map(ac => ({
          label: ac.label,
          value: getClassSumPrevisionnel(ac.code, 'depense')
        }))
    )
  );

  let recettesChartDataPrevisionnel = $derived(
    generatePieSlices(
      accountClasses
        .filter(ac => ac.type === 'recette')
        .map(ac => ({
          label: ac.label,
          value: getClassSumPrevisionnel(ac.code, 'recette')
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
    } catch (err: unknown) {
      saveStatus = { type: 'error', message: err.message || "Impossible d'enregistrer le budget." };
    } finally {
      isSaving = false;
    }
  }

  function getCategoryLabel(key: string): string {
    const id = parseInt(key);
    if (!isNaN(id)) {
      const found = categories.find(c => c.id === id);
      if (found) {
        return found.adminLabel;
      }
    }
    const foundByCode = categories.find(c => (c as any).code === key);
    if (foundByCode) {
      return foundByCode.adminLabel;
    }
    return key;
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

  // Helper to safely get total for a category and type
  function getCatTotal(id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel'): number {
    const reportToUse = (mode === 'previsionnel' && prevReport) ? prevReport : report;
    return reportToUse.compteResultat.categories[`${id}_${type}`]?.total || 0;
  }


  function getClassItems(classCode: string, type: 'recette' | 'depense'): { label: string, total: number }[] {
    const items: { label: string, total: number }[] = [];
    for (const cat of categories) {
      const code = type === 'recette' ? cat.receiptCode : cat.expenseCode;
      if (code === classCode) {
        const total = getCatTotal(cat.id.toString(), type, reportMode);
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

<div class="space-y-6">
  <Tabs.Root bind:value={activeTab} class="space-y-6">
    <Tabs.List class="no-print">
      <Tabs.Trigger value="resultat">Compte de résultat</Tabs.Trigger>
      <Tabs.Trigger value="tresorerie">Bilan de trésorerie</Tabs.Trigger>
      <Tabs.Trigger value="budget">Budget prévisionnel</Tabs.Trigger>
    </Tabs.List>

    <!-- Onglet 1 : « Compte de résultat » (value="resultat") -->
    <Tabs.Content value="resultat" class="space-y-6">
      {@render compteResultatCard('realise')}
      {@render graphiquesCard('realise')}
    </Tabs.Content>

    <!-- Onglet 2 : « Bilan de trésorerie » (value="tresorerie") -->
    <Tabs.Content value="tresorerie" class="space-y-6">
      <Card.Root>
        <Card.Content class="p-6 space-y-4">
          <!-- Printable Title for A4 -->
          <div class="hidden print:block text-center space-y-1 mb-6">
            <h3 class="text-xl font-bold tracking-tight">Bilan de Trésorerie</h3>
            <p class="text-xs text-muted-foreground">Saison {seasons.find(s => s.id === selectedSeason)?.name || selectedSeason}</p>
          </div>

          <h3 class="text-lg font-semibold no-print">2. Bilan de Trésorerie</h3>
          <div class="overflow-x-auto">
            <Table.Root class="w-full border-collapse text-left text-sm">
              <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
                <Table.Row>
                  <Table.Head class="p-4">Compte Financier</Table.Head>
                  <Table.Head class="p-4 text-right">Solde Initial (1er sept.)</Table.Head>
                  <Table.Head class="p-4 text-right">Mouvements de saison</Table.Head>
                  <Table.Head class="p-4 text-right">Solde Réel Final (31 août)</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body class="divide-y divide-border">
                {#each report.bilanTrésorerie as item}
                  <Table.Row>
                    <Table.Cell class="p-4 font-semibold">{accountLabels[item.accountId]}</Table.Cell>
                    <Table.Cell class="p-4 text-right">{formatAmount(item.initialBalance)}</Table.Cell>
                    <Table.Cell class="p-4 text-right font-medium {item.finalBalance - item.initialBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}">
                      {formatDelta(item.finalBalance - item.initialBalance)}
                    </Table.Cell>
                    <Table.Cell class="p-4 text-right font-bold">{formatAmount(item.finalBalance)}</Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Onglet 3 : « Budget prévisionnel » (value="budget") -->
    <Tabs.Content value="budget" class="space-y-6">
      {@render compteResultatCard('previsionnel')}
      {@render graphiquesCard('previsionnel')}
    </Tabs.Content>
  </Tabs.Root>
</div>

{#snippet compteResultatCard(mode: 'realise' | 'previsionnel')}
  {@const totalDepReal = getTotalDepensesRealise(mode)}
  {@const totalRecReal = getTotalRecettesRealise(mode)}
  {@const netResReal = totalRecReal - totalDepReal}
  {@const netResPrev = totalRecettesPrevisionnel - totalDepensesPrevisionnel}

  <Card.Root class="print-container">
    <Card.Content class="p-6 space-y-6">
      <!-- Printable Title for A4 -->
      <div class="hidden print:block text-center space-y-1 mb-6">
        <h3 class="text-xl font-bold tracking-tight">
          {mode === 'realise' ? 'Compte de Résultat Simplifié (Réalisé)' : 'Budget Prévisionnel'}
        </h3>
        <p class="text-xs text-muted-foreground">Saison {seasons.find(s => s.id === selectedSeason)?.name || selectedSeason}</p>
      </div>

      <!-- Header with Tab Mode Title -->
      <div class="flex items-center justify-between border-b border-border pb-4 no-print">
        <h3 class="text-lg font-semibold">
          {mode === 'realise' ? '1. Compte de Résultat' : '3. Budget Prévisionnel'}
        </h3>
      </div>

      <div class="grid gap-6 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <!-- CHARGES (Dépenses) -->
        <div class="space-y-4 pr-0 md:pr-6 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
              <span class="text-sm font-bold text-destructive">CHARGES (Dépenses)</span>
              <div class="flex gap-8 text-[11px]">
                <span class="w-20 text-right font-semibold">
                  {#if mode === 'previsionnel' && prevReport}
                    Réalisé {seasons.find(s => s.id === getPreviousSeasonId(selectedSeason))?.name.replace('Saison ', '') || getPreviousSeasonId(selectedSeason)}
                  {:else}
                    Réalisé
                  {/if}
                </span>
                <span class="w-20 text-right font-semibold">Prévisionnel</span>
              </div>
            </div>
            
            <div class="space-y-4 mt-4">
              {#each chargeClasses as cc}
                {#if mode === 'previsionnel' || getClassSumRealise(cc.code, 'depense', mode) > 0 || getClassSumPrevisionnel(cc.code, 'depense') > 0}
                  <div class="space-y-1.5 py-1 {getClassSumRealise(cc.code, 'depense', mode) === 0 && getClassSumPrevisionnel(cc.code, 'depense') === 0 ? 'print:hidden' : ''}">
                    <div class="flex justify-between items-center text-sm border-b border-border/40 pb-1 font-bold text-foreground">
                      <a href="/admin/accounting?season={selectedSeason}&classCode={cc.code}" class="hover:underline hover:text-primary transition-colors cursor-pointer text-foreground/90 print:no-underline" title="Voir les écritures dans le grand livre">{cc.label}</a>
                      <div class="flex gap-8">
                        <span class="w-20 text-right">{formatAmount(getClassSumRealise(cc.code, 'depense', mode))}</span>
                        <span class="w-20 text-right">{formatAmount(getClassSumPrevisionnel(cc.code, 'depense'))}</span>
                      </div>
                    </div>
                    
                    <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                      {#each getClassCategories(cc.code, 'depense') as cat}
                        {#if mode === 'previsionnel' || getCatTotal(cat.id.toString(), 'depense', mode) > 0 || (editableBudget[`${cat.id}_depense`] || 0) > 0}
                          <div class="flex justify-between items-center py-0.5 text-[11px] {getCatTotal(cat.id.toString(), 'depense', mode) === 0 && (editableBudget[`${cat.id}_depense`] || 0) === 0 ? 'print:hidden' : ''}">
                            <a href="/admin/accounting?season={selectedSeason}&category={cat.id}" class="font-sans text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer print:no-underline" title="Voir les écritures de cette catégorie dans le grand livre">• {cat.adminLabel}</a>
                            <div class="flex gap-8 items-center">
                              <span class="w-20 text-right">{formatAmount(getCatTotal(cat.id.toString(), 'depense', mode))}</span>
                              {#if mode === 'previsionnel' && !isClosed}
                                <div class="relative flex items-center w-20">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={editableBudget[`${cat.id}_depense`] !== undefined ? (editableBudget[`${cat.id}_depense`] / 100) : ''}
                                    oninput={(e) => {
                                      const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                                      editableBudget[`${cat.id}_depense`] = Math.round(val * 100);
                                    }}
                                    class="w-20 h-7 px-1 py-0.5 text-right border border-border bg-background rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium no-print"
                                  />
                                  <span class="absolute right-1 text-[10px] text-muted-foreground pointer-events-none no-print">€</span>
                                  <span class="hidden print:inline text-right w-full">{formatAmount(editableBudget[`${cat.id}_depense`] || 0)}</span>
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
            {#if netResReal >= 0 || netResPrev >= 0}
              <div class="flex justify-between font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                <span>Excédent de l'exercice (Bénéfice)</span>
                <div class="flex gap-8">
                  <span class="w-20 text-right">{netResReal >= 0 ? formatAmount(netResReal) : formatAmount(0)}</span>
                  <span class="w-20 text-right">{netResPrev >= 0 ? formatAmount(netResPrev) : formatAmount(0)}</span>
                </div>
              </div>
            {/if}
            <div class="flex justify-between text-foreground">
              <span>TOTAL GÉNÉRAL</span>
              <div class="flex gap-8">
                <span class="w-20 text-right">{formatAmount(netResReal >= 0 ? totalDepReal + netResReal : totalDepReal)}</span>
                <span class="w-20 text-right">{formatAmount(netResPrev >= 0 ? totalDepensesPrevisionnel + netResPrev : totalDepensesPrevisionnel)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PRODUITS (Recettes) -->
        <div class="space-y-4 pl-0 md:pl-6 pt-6 md:pt-0 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
              <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">PRODUITS (Recettes)</span>
              <div class="flex gap-8 text-[11px]">
                <span class="w-20 text-right font-semibold">
                  {#if mode === 'previsionnel' && prevReport}
                    Réalisé {seasons.find(s => s.id === getPreviousSeasonId(selectedSeason))?.name.replace('Saison ', '') || getPreviousSeasonId(selectedSeason)}
                  {:else}
                    Réalisé
                  {/if}
                </span>
                <span class="w-20 text-right font-semibold">Prévisionnel</span>
              </div>
            </div>
            
            <div class="space-y-4 mt-4">
              {#each produitClasses as pc}
                {#if mode === 'previsionnel' || getClassSumRealise(pc.code, 'recette', mode) > 0 || getClassSumPrevisionnel(pc.code, 'recette') > 0}
                  <div class="space-y-1.5 py-1 {getClassSumRealise(pc.code, 'recette', mode) === 0 && getClassSumPrevisionnel(pc.code, 'recette') === 0 ? 'print:hidden' : ''}">
                    <div class="flex justify-between items-center text-sm border-b border-border/40 pb-1 font-bold text-foreground">
                      <a href="/admin/accounting?season={selectedSeason}&classCode={pc.code}" class="hover:underline hover:text-primary transition-colors cursor-pointer text-foreground/90 print:no-underline" title="Voir les écritures dans le grand livre">{pc.label}</a>
                      <div class="flex gap-8">
                        <span class="w-20 text-right">{formatAmount(getClassSumRealise(pc.code, 'recette', mode))}</span>
                        <span class="w-20 text-right">{formatAmount(getClassSumPrevisionnel(pc.code, 'recette'))}</span>
                      </div>
                    </div>
                    
                    <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                      {#each getClassCategories(pc.code, 'recette') as cat}
                        {#if mode === 'previsionnel' || getCatTotal(cat.id.toString(), 'recette', mode) > 0 || (editableBudget[`${cat.id}_recette`] || 0) > 0}
                          <div class="flex justify-between items-center py-0.5 text-[11px] {getCatTotal(cat.id.toString(), 'recette', mode) === 0 && (editableBudget[`${cat.id}_recette`] || 0) === 0 ? 'print:hidden' : ''}">
                            <a href="/admin/accounting?season={selectedSeason}&category={cat.id}" class="font-sans text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer print:no-underline" title="Voir les écritures de cette catégorie dans le grand livre">• {cat.adminLabel}</a>
                            <div class="flex gap-8 items-center">
                              <span class="w-20 text-right">{formatAmount(getCatTotal(cat.id.toString(), 'recette', mode))}</span>
                              {#if mode === 'previsionnel' && !isClosed}
                                <div class="relative flex items-center w-20">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={editableBudget[`${cat.id}_recette`] !== undefined ? (editableBudget[`${cat.id}_recette`] / 100) : ''}
                                    oninput={(e) => {
                                      const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                                      editableBudget[`${cat.id}_recette`] = Math.round(val * 100);
                                    }}
                                    class="w-20 h-7 px-1 py-0.5 text-right border border-border bg-background rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium no-print"
                                  />
                                  <span class="absolute right-1 text-[10px] text-muted-foreground pointer-events-none no-print">€</span>
                                  <span class="hidden print:inline text-right w-full">{formatAmount(editableBudget[`${cat.id}_recette`] || 0)}</span>
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
            {#if netResReal < 0 || netResPrev < 0}
              <div class="flex justify-between font-semibold text-xs text-destructive">
                <span>Déficit de l'exercice (Perte)</span>
                <div class="flex gap-8">
                  <span class="w-20 text-right">{netResReal < 0 ? formatAmount(-netResReal) : formatAmount(0)}</span>
                  <span class="w-20 text-right">{netResPrev < 0 ? formatAmount(-netResPrev) : formatAmount(0)}</span>
                </div>
              </div>
            {/if}
            <div class="flex justify-between text-foreground">
              <span>TOTAL GÉNÉRAL</span>
              <div class="flex gap-8">
                <span class="w-20 text-right">{formatAmount(netResReal < 0 ? totalRecReal + (-netResReal) : totalRecReal)}</span>
                <span class="w-20 text-right">{formatAmount(netResPrev < 0 ? totalRecettesPrevisionnel + (-netResPrev) : totalRecettesPrevisionnel)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions / Feedback for Budget editing -->
      {#if mode === 'previsionnel' && !isClosed}
        <div class="flex flex-col gap-3 pt-4 border-t border-border mt-6 no-print">
          {#if saveStatus}
            <div class="p-3 text-xs rounded-lg {saveStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}">
              {saveStatus.message}
            </div>
          {/if}
          
          <div class="flex justify-end">
            <Button
              onclick={handleSaveBudget}
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
{/snippet}

{#snippet graphiquesCard(mode: 'realise' | 'previsionnel')}
  {@const chargesData = mode === 'realise' ? chargesChartDataRealise : chargesChartDataPrevisionnel}
  {@const recettesData = mode === 'realise' ? recettesChartDataRealise : recettesChartDataPrevisionnel}

  <Card.Root class="page-break">
    <Card.Content class="p-6 space-y-6">
      <div class="text-center space-y-1 mb-2">
        <h3 class="text-lg font-bold tracking-tight">
          {mode === 'realise' ? '2. Répartition Graphique du Réalisé' : '4. Répartition Graphique des Budgets'}
        </h3>
        <p class="text-xs text-muted-foreground">Représentation par classes de comptes (Mode : {mode === 'realise' ? 'Réalisé' : 'Prévisionnel'})</p>
      </div>
      
      <div class="grid md:grid-cols-2 gap-8">
        <!-- Charges Chart -->
        <div class="border border-border/80 rounded-xl p-6 flex flex-col items-center justify-between bg-muted/20">
          <h4 class="font-bold text-sm text-destructive mb-6 text-center">Charges (Dépenses)</h4>
          {#if chargesData.length > 0}
            <div class="flex flex-col items-center gap-6 w-full">
              <svg width="180" height="180" viewBox="0 0 200 200" class="drop-shadow-sm rotate-[-90deg]">
                {#each chargesData as slice}
                  <path d={slice.pathData} fill={slice.color} class="hover:opacity-90 transition-opacity" />
                {/each}
              </svg>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs pt-4 border-t border-border/60">
                {#each chargesData as slice}
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
                    <span class="truncate text-foreground/80 font-medium" title={slice.label}>{slice.label} : <strong class="font-semibold">{slice.percent}%</strong></span>
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
          {#if recettesData.length > 0}
            <div class="flex flex-col items-center gap-6 w-full">
              <svg width="180" height="180" viewBox="0 0 200 200" class="drop-shadow-sm rotate-[-90deg]">
                {#each recettesData as slice}
                  <path d={slice.pathData} fill={slice.color} class="hover:opacity-90 transition-opacity" />
                {/each}
              </svg>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs pt-4 border-t border-border/60">
                {#each recettesData as slice}
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
                    <span class="truncate text-foreground/80 font-medium" title={slice.label}>{slice.label} : <strong class="font-semibold">{slice.percent}%</strong></span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <p class="text-xs text-muted-foreground italic my-8">Aucune recette à afficher.</p>
          {/if}
        </div>
      </div>
    </Card.Content>
  </Card.Root>
{/snippet}

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
    :global(.page-break) {
      page-break-before: always;
      break-before: page;
      margin-top: 0 !important;
      padding-top: 1.5rem !important;
      border: none !important;
      box-shadow: none !important;
    }
    :global(.bg-card) {
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 0 !important;
    }
    :global(.print-container) {
      width: 100% !important;
      max-width: 100% !important;
    }
    /* Compact layout adjustments to ensure exactly 1 page */
    :global(.print-container) :global(.grid) {
      gap: 1rem !important;
    }
    :global(.print-container) :global(.space-y-4) {
      margin-top: 0.3rem !important;
    }
    :global(.print-container) :global(.py-1) {
      padding-top: 0.1rem !important;
      padding-bottom: 0.1rem !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }
    :global(.print-container) :global(h4) {
      font-size: 12px !important;
      padding-bottom: 0.25rem !important;
    }
    :global(.print-container) :global(.text-sm) {
      font-size: 11px !important;
    }
    :global(.print-container) :global(.text-xs), :global(.print-container) :global(.text-\[11px\]) {
      font-size: 9.5px !important;
    }
    :global(.print-container) :global(.mt-8) {
      margin-top: 1rem !important;
    }
    :global(.print-container) :global(.pt-4) {
      padding-top: 0.5rem !important;
    }

    /* Print all tabs */
    :global([data-slot="tabs-content"]) {
      display: block !important;
      page-break-before: always;
      break-before: page;
    }
    :global([data-slot="tabs-content"]:first-of-type) {
      page-break-before: avoid;
      break-before: avoid;
    }
  }
</style>
