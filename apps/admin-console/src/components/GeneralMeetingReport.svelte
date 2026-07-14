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
  }

  interface DbCategory {
    id: number;
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses: boolean;
    codeRecette?: string | null;
    codeDepense?: string | null;
  }

  let { report, seasonId, seasons = [], categories = [], viewMode = 'cerfa' }: { report: ReportData; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; viewMode?: string } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  // svelte-ignore state_referenced_locally
  let activeViewMode = $state(viewMode);

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

  // Derived accounting sums using DB-defined codes
  function getClassSum(classCode: string, type: 'recette' | 'depense'): number {
    let sum = 0;
    for (const cat of categories) {
      const code = type === 'recette' ? cat.codeRecette : cat.codeDepense;
      if (code === classCode) {
        sum += getCatTotal(cat.id.toString(), type);
      }
    }
    return sum;
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

  const chargeClasses = [
    { code: '60', label: '60 - Achats' },
    { code: '61', label: '61 - Services extérieurs' },
    { code: '62', label: '62 - Autres services extérieurs' },
    { code: '64', label: '64 - Charges de personnel' },
    { code: '65', label: '65 - Autres charges de gestion courante' },
    { code: '67', label: '67 - Charges exceptionnelles' }
  ];

  const produitClasses = [
    { code: '70', label: '70 - Vente de produits & prestations' },
    { code: '74', label: '74 - Subventions d\'exploitation' },
    { code: '75', label: '75 - Autres produits de gestion courante' },
    { code: '77', label: '77 - Produits exceptionnels' }
  ];
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
          class="px-3 py-1 text-xs font-semibold rounded-md transition-colors {activeViewMode === 'cerfa' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => activeViewMode = 'cerfa'}
        >
          Format Standard (CR)
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs font-semibold rounded-md transition-colors {activeViewMode === 'categories' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => activeViewMode = 'categories'}
        >
          Par Catégories de l'App
        </button>
      </div>
    </div>

    {#if activeViewMode === 'cerfa'}
      <div class="grid gap-6 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <!-- CHARGES (Dépenses) -->
        <div class="space-y-4 pr-0 md:pr-6">
          <h4 class="font-bold text-sm text-destructive border-b border-border pb-2 flex justify-between">
            <span>CHARGES (Dépenses)</span>
            <span>{(report.compteResultat.totalDepenses / 100).toFixed(2)} €</span>
          </h4>
          
          <div class="space-y-4">
            {#each chargeClasses as cc}
              {#if getClassSum(cc.code, 'depense') > 0}
                <div class="space-y-1.5">
                  <div class="flex justify-between font-semibold text-sm">
                    <span>{cc.label}</span>
                    <span>{(getClassSum(cc.code, 'depense') / 100).toFixed(2)} €</span>
                  </div>
                  <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                    {#each getClassItems(cc.code, 'depense') as item}
                      <div class="flex justify-between">
                        <span>• {item.label}</span>
                        <span>{(item.total / 100).toFixed(2)} €</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- PRODUITS (Recettes) -->
        <div class="space-y-4 pl-0 md:pl-6 pt-6 md:pt-0">
          <h4 class="font-bold text-sm text-emerald-600 dark:text-emerald-400 border-b border-border pb-2 flex justify-between">
            <span>PRODUITS (Recettes)</span>
            <span>{(report.compteResultat.totalRecettes / 100).toFixed(2)} €</span>
          </h4>
          
          <div class="space-y-4">
            {#each produitClasses as pc}
              {#if getClassSum(pc.code, 'recette') > 0}
                <div class="space-y-1.5">
                  <div class="flex justify-between font-semibold text-sm">
                    <span>{pc.label}</span>
                    <span>{(getClassSum(pc.code, 'recette') / 100).toFixed(2)} €</span>
                  </div>
                  <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                    {#each getClassItems(pc.code, 'recette') as item}
                      <div class="flex justify-between">
                        <span>• {item.label}</span>
                        <span>{(item.total / 100).toFixed(2)} €</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <div class="grid gap-6 md:grid-cols-2">
        <!-- Recettes -->
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-border pb-2">
            <span class="font-bold text-emerald-600 dark:text-emerald-400">Total Recettes</span>
            <span class="font-bold text-lg text-emerald-600 dark:text-emerald-400">{(report.compteResultat.totalRecettes / 100).toFixed(2)} €</span>
          </div>
          <div class="space-y-3">
            {#each Object.entries(report.compteResultat.categories) as [key, cat]}
              {#if cat.type === 'recette'}
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">{getCategoryLabel(key)}</span>
                  <span class="font-semibold">{(cat.total / 100).toFixed(2)} €</span>
                </div>
              {/if}
            {:else}
              <div class="text-xs text-muted-foreground italic">Aucune recette enregistrée.</div>
            {/each}
          </div>
        </div>

        <!-- Dépenses -->
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-border pb-2">
            <span class="font-bold text-destructive">Total Dépenses</span>
            <span class="font-bold text-lg text-destructive">{(report.compteResultat.totalDepenses / 100).toFixed(2)} €</span>
          </div>
          <div class="space-y-3">
            {#each Object.entries(report.compteResultat.categories) as [key, cat]}
              {#if cat.type === 'depense'}
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">{getCategoryLabel(key)}</span>
                  <span class="font-semibold">{(cat.total / 100).toFixed(2)} €</span>
                </div>
              {/if}
            {:else}
              <div class="text-xs text-muted-foreground italic">Aucune dépense enregistrée.</div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Résultat Net -->
    <div class="p-4 rounded-xl border border-border flex items-center justify-between {report.compteResultat.netResult >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}">
      <span class="font-semibold">Solde / Résultat Net de la saison</span>
      <span class="font-bold text-xl">{(report.compteResultat.netResult / 100).toFixed(2)} €</span>
    </div>
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
              <td class="p-4 text-right">{(item.initialBalance / 100).toFixed(2)} €</td>
              <td class="p-4 text-right font-medium {item.finalBalance - item.initialBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}">
                {item.finalBalance - item.initialBalance >= 0 ? '+' : ''}{((item.finalBalance - item.initialBalance) / 100).toFixed(2)} €
              </td>
              <td class="p-4 text-right font-bold">{(item.finalBalance / 100).toFixed(2)} €</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
