<script lang="ts">
  import { AlertCircle } from 'lucide-svelte';

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

  let { report, seasonId, seasons = [], categories = [], accountClasses = [], budget = [] }: { report: ReportData; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; accountClasses?: AccountClass[]; budget?: BudgetRecord[] } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  let reportMode = $state<'realise' | 'previsionnel'>('realise');
  let editableBudget = $state<Record<string, number>>({});
  let isSaving = $state(false);
  let saveStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // Get total for a class code and flow type (dynamic based on reportMode)
  function getClassSum(classCode: string, type: 'recette' | 'depense'): number {
    const classCats = getClassCategories(classCode, type);
    if (reportMode === 'realise') {
      let sum = 0;
      for (const cat of classCats) {
        sum += getCatTotal(cat.id.toString(), type);
      }
      return sum;
    } else {
      return classCats.reduce((sum, cat) => sum + (editableBudget[`${cat.id}_${type}`] || 0), 0);
    }
  }

  let totalDepenses = $derived(
    reportMode === 'realise'
      ? report.compteResultat.totalDepenses
      : accountClasses
          .filter(ac => ac.type === 'depense')
          .reduce((sum, ac) => sum + getClassSum(ac.code, 'depense'), 0)
  );

  let totalRecettes = $derived(
    reportMode === 'realise'
      ? report.compteResultat.totalRecettes
      : accountClasses
          .filter(ac => ac.type === 'recette')
          .reduce((sum, ac) => sum + getClassSum(ac.code, 'recette'), 0)
  );

  let netResult = $derived(totalRecettes - totalDepenses);

  let isClosed = $derived(
    seasons.find(s => s.id === selectedSeason)?.closed || false
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
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(euros).replace(/\u202f|\u00a0/g, ' ') + ' €';
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
    return report.compteResultat.categories[`${id}_${type}`]?.total || 0;
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
        class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary font-medium"
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
  </div>

  <!-- 1. COMPTE DE RÉSULTAT -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
    <div class="flex items-center justify-between border-b border-border pb-4">
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

    <div class="grid gap-6 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
      <!-- CHARGES (Dépenses) -->
      <div class="space-y-4 pr-0 md:pr-6 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-sm text-destructive border-b border-border pb-2 flex justify-between">
            <span>CHARGES (Dépenses)</span>
            <span>{formatAmount(totalDepenses)}</span>
          </h4>
          
          <div class="space-y-4 mt-4">
            {#each chargeClasses as cc}
              {#if reportMode === 'previsionnel' || getClassSum(cc.code, 'depense') > 0}
                <div class="space-y-1.5 py-1">
                  <div class="flex justify-between items-center text-sm border-b border-border/40 pb-1">
                    <span class="font-semibold text-foreground/90">{cc.label}</span>
                    <span class="font-mono font-bold text-foreground">{formatAmount(getClassSum(cc.code, 'depense'))}</span>
                  </div>
                  
                  {#if reportMode === 'realise'}
                    <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                      {#each getClassItems(cc.code, 'depense') as item}
                        <div class="flex justify-between font-mono">
                          <span class="font-sans">• {item.label}</span>
                          <span>{formatAmount(item.total)}</span>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                      {#each getClassCategories(cc.code, 'depense') as cat}
                        <div class="flex justify-between items-center py-0.5 font-mono">
                          <span class="font-sans text-muted-foreground">• {cat.adminLabel}</span>
                          {#if !isClosed}
                            <div class="relative flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={editableBudget[`${cat.id}_depense`] !== undefined ? (editableBudget[`${cat.id}_depense`] / 100) : ''}
                                oninput={(e) => {
                                  const val = parseFloat(e.currentTarget.value) || 0;
                                  editableBudget[`${cat.id}_depense`] = Math.round(val * 100);
                                }}
                                class="w-24 px-2 py-0.5 text-right border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium font-mono"
                              />
                              <span class="absolute right-2 text-xs text-muted-foreground pointer-events-none">€</span>
                            </div>
                          {:else}
                            <span>{formatAmount(editableBudget[`${cat.id}_depense`] || 0)}</span>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-border space-y-2">
          {#if netResult >= 0}
            <div class="flex justify-between font-semibold text-sm text-emerald-600 dark:text-emerald-400">
              <span>Excédent de l'exercice (Bénéfice)</span>
              <span class="font-mono">{formatAmount(netResult)}</span>
            </div>
          {/if}
          <div class="flex justify-between font-bold text-sm text-foreground">
            <span>TOTAL GÉNÉRAL</span>
            <span class="font-mono">
              {formatAmount(netResult >= 0 ? totalDepenses + netResult : totalDepenses)}
            </span>
          </div>
        </div>
      </div>

      <!-- PRODUITS (Recettes) -->
      <div class="space-y-4 pl-0 md:pl-6 pt-6 md:pt-0 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-sm text-emerald-600 dark:text-emerald-400 border-b border-border pb-2 flex justify-between">
            <span>PRODUITS (Recettes)</span>
            <span>{formatAmount(totalRecettes)}</span>
          </h4>
          
          <div class="space-y-4 mt-4">
            {#each produitClasses as pc}
              {#if reportMode === 'previsionnel' || getClassSum(pc.code, 'recette') > 0}
                <div class="space-y-1.5 py-1">
                  <div class="flex justify-between items-center text-sm border-b border-border/40 pb-1">
                    <span class="font-semibold text-foreground/90">{pc.label}</span>
                    <span class="font-mono font-bold text-foreground">{formatAmount(getClassSum(pc.code, 'recette'))}</span>
                  </div>
                  
                  {#if reportMode === 'realise'}
                    <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                      {#each getClassItems(pc.code, 'recette') as item}
                        <div class="flex justify-between font-mono">
                          <span class="font-sans">• {item.label}</span>
                          <span>{formatAmount(item.total)}</span>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                      {#each getClassCategories(pc.code, 'recette') as cat}
                        <div class="flex justify-between items-center py-0.5 font-mono">
                          <span class="font-sans text-muted-foreground">• {cat.adminLabel}</span>
                          {#if !isClosed}
                            <div class="relative flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={editableBudget[`${cat.id}_recette`] !== undefined ? (editableBudget[`${cat.id}_recette`] / 100) : ''}
                                oninput={(e) => {
                                  const val = parseFloat(e.currentTarget.value) || 0;
                                  editableBudget[`${cat.id}_recette`] = Math.round(val * 100);
                                }}
                                class="w-24 px-2 py-0.5 text-right border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium font-mono"
                              />
                              <span class="absolute right-2 text-xs text-muted-foreground pointer-events-none">€</span>
                            </div>
                          {:else}
                            <span>{formatAmount(editableBudget[`${cat.id}_recette`] || 0)}</span>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-border space-y-2">
          {#if netResult < 0}
            <div class="flex justify-between font-semibold text-sm text-destructive">
              <span>Déficit de l'exercice (Perte)</span>
              <span class="font-mono">{formatAmount(-netResult)}</span>
            </div>
          {/if}
          <div class="flex justify-between font-bold text-sm text-foreground">
            <span>TOTAL GÉNÉRAL</span>
            <span class="font-mono">
              {formatAmount(netResult < 0 ? totalRecettes + (-netResult) : totalRecettes)}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions / Feedback for Budget editing -->
    {#if reportMode === 'previsionnel' && !isClosed}
      <div class="flex flex-col gap-3 pt-4 border-t border-border mt-6">
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

  <!-- 2. BILAN DE TRÉSORERIE -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
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
