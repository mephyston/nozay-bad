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

  interface AccountClass {
    code: string;
    label: string;
    type: 'recette' | 'depense';
  }

  let { report, seasonId, seasons = [], categories = [], accountClasses = [], viewMode = 'cerfa' }: { report: ReportData; seasonId: string; seasons?: Season[]; categories?: DbCategory[]; accountClasses?: AccountClass[]; viewMode?: string } = $props();

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
    </div>

    <div class="grid gap-6 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
      <!-- CHARGES (Dépenses) -->
      <div class="space-y-4 pr-0 md:pr-6 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-sm text-destructive border-b border-border pb-2 flex justify-between">
            <span>CHARGES (Dépenses)</span>
            <span>{formatAmount(report.compteResultat.totalDepenses)}</span>
          </h4>
          
          <div class="space-y-4 mt-4">
            {#each chargeClasses as cc}
              {#if getClassSum(cc.code, 'depense') > 0}
                <div class="space-y-1.5">
                  <div class="flex justify-between font-semibold text-sm">
                    <span>{cc.label}</span>
                    <span>{formatAmount(getClassSum(cc.code, 'depense'))}</span>
                  </div>
                  <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                    {#each getClassItems(cc.code, 'depense') as item}
                      <div class="flex justify-between">
                        <span>• {item.label}</span>
                        <span>{formatAmount(item.total)}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-border space-y-2">
          {#if report.compteResultat.netResult >= 0}
            <div class="flex justify-between font-semibold text-sm text-emerald-600 dark:text-emerald-400">
              <span>Excédent de l'exercice (Bénéfice)</span>
              <span>{formatAmount(report.compteResultat.netResult)}</span>
            </div>
          {/if}
          <div class="flex justify-between font-bold text-sm text-foreground">
            <span>TOTAL GÉNÉRAL</span>
            <span>
              {formatAmount(report.compteResultat.netResult >= 0 
                ? report.compteResultat.totalDepenses + report.compteResultat.netResult 
                : report.compteResultat.totalDepenses)}
            </span>
          </div>
        </div>
      </div>

      <!-- PRODUITS (Recettes) -->
      <div class="space-y-4 pl-0 md:pl-6 pt-6 md:pt-0 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-sm text-emerald-600 dark:text-emerald-400 border-b border-border pb-2 flex justify-between">
            <span>PRODUITS (Recettes)</span>
            <span>{formatAmount(report.compteResultat.totalRecettes)}</span>
          </h4>
          
          <div class="space-y-4 mt-4">
            {#each produitClasses as pc}
              {#if getClassSum(pc.code, 'recette') > 0}
                <div class="space-y-1.5">
                  <div class="flex justify-between font-semibold text-sm">
                    <span>{pc.label}</span>
                    <span>{formatAmount(getClassSum(pc.code, 'recette'))}</span>
                  </div>
                  <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                    {#each getClassItems(pc.code, 'recette') as item}
                      <div class="flex justify-between">
                        <span>• {item.label}</span>
                        <span>{formatAmount(item.total)}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-border space-y-2">
          {#if report.compteResultat.netResult < 0}
            <div class="flex justify-between font-semibold text-sm text-destructive">
              <span>Déficit de l'exercice (Perte)</span>
              <span>{formatAmount(-report.compteResultat.netResult)}</span>
            </div>
          {/if}
          <div class="flex justify-between font-bold text-sm text-foreground">
            <span>TOTAL GÉNÉRAL</span>
            <span>
              {formatAmount(report.compteResultat.netResult < 0 
                ? report.compteResultat.totalRecettes + (-report.compteResultat.netResult) 
                : report.compteResultat.totalRecettes)}
            </span>
          </div>
        </div>
      </div>
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
