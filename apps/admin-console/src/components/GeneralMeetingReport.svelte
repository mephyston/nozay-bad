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

  // Derived accounting sums (CERFA structure)
  const cat1_recette = $derived(getCatTotal('1', 'recette'));
  const cat1_depense = $derived(getCatTotal('1', 'depense'));
  const cat2_recette = $derived(getCatTotal('2', 'recette'));
  const cat2_depense = $derived(getCatTotal('2', 'depense'));
  const cat3_recette = $derived(getCatTotal('3', 'recette'));
  const cat3_depense = $derived(getCatTotal('3', 'depense'));
  const cat4_recette = $derived(getCatTotal('4', 'recette'));
  const cat4_depense = $derived(getCatTotal('4', 'depense'));
  const cat5_recette = $derived(getCatTotal('5', 'recette'));
  const cat5_depense = $derived(getCatTotal('5', 'depense'));
  const cat6_recette = $derived(getCatTotal('6', 'recette'));
  const cat6_depense = $derived(getCatTotal('6', 'depense'));
  const cat7_recette = $derived(getCatTotal('7', 'recette'));
  const cat7_depense = $derived(getCatTotal('7', 'depense'));
  const cat8_recette = $derived(getCatTotal('8', 'recette'));
  const cat8_depense = $derived(getCatTotal('8', 'depense'));
  const cat9_recette = $derived(getCatTotal('9', 'recette'));
  const cat9_depense = $derived(getCatTotal('9', 'depense'));
  const cat10_recette = $derived(getCatTotal('10', 'recette'));
  const cat10_depense = $derived(getCatTotal('10', 'depense'));
  const cat11_recette = $derived(getCatTotal('11', 'recette'));
  const cat11_depense = $derived(getCatTotal('11', 'depense'));
  const cat12_recette = $derived(getCatTotal('12', 'recette'));
  const cat12_depense = $derived(getCatTotal('12', 'depense'));
  const cat13_recette = $derived(getCatTotal('13', 'recette'));
  const cat13_depense = $derived(getCatTotal('13', 'depense'));
  const cat14_recette = $derived(getCatTotal('14', 'recette'));
  const cat14_depense = $derived(getCatTotal('14', 'depense'));

  // Charges
  const class60 = $derived(cat7_depense + cat6_depense + cat8_depense + cat10_depense);
  const class61 = $derived(cat13_depense);
  const class62 = $derived(cat12_depense + cat4_depense + cat14_depense + cat5_depense);
  const class64 = $derived(cat9_depense);
  const class65 = $derived(cat11_depense);
  const class67 = $derived(cat1_depense); // Adhesion refunds

  // Produits
  const class70 = $derived((cat8_recette + cat10_recette) + cat7_recette + (cat5_recette + cat6_recette + cat13_recette));
  const class74 = $derived(cat3_recette + cat2_recette);
  const class75 = $derived(cat1_recette + cat12_recette);
  const class77 = $derived(cat14_recette);
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
            <!-- 60 - Achats -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>60 - Achats</span>
                <span>{(class60 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Prestations de cordages (revente)</span>
                  <span>{(cat7_depense / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Alimentation et boissons (buvette)</span>
                  <span>{(cat6_depense / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Volants et équipements club</span>
                  <span>{((cat8_depense + cat10_depense) / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 61 - Services extérieurs -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>61 - Services extérieurs</span>
                <span>{(class61 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Formations et stages techniques</span>
                  <span>{(cat13_depense / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 62 - Autres services extérieurs -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>62 - Autres services extérieurs</span>
                <span>{(class62 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Rémunérations intermédiaires (arbitrage)</span>
                  <span>{(cat12_depense / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Déplacements et notes de frais (actions jeunes)</span>
                  <span>{(cat4_depense / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Services bancaires, web et postes</span>
                  <span>{(cat14_depense / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Frais tournois et compétitions seniors</span>
                  <span>{(cat5_depense / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 64 - Charges de personnel -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>64 - Charges de personnel</span>
                <span>{(class64 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Rémunérations directes & charges sociales</span>
                  <span>{(cat9_depense / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 65 - Autres charges de gestion courante -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>65 - Autres charges de gestion courante</span>
                <span>{(class65 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Reversement licences fédérales & affiliation</span>
                  <span>{(cat11_depense / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 67 - Charges exceptionnelles -->
            {#if class67 > 0}
              <div class="space-y-1.5">
                <div class="flex justify-between font-semibold text-sm">
                  <span>67 - Charges exceptionnelles</span>
                  <span>{(class67 / 100).toFixed(2)} €</span>
                </div>
                <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                  <div class="flex justify-between">
                    <span>• Corrections et remboursements d'adhésions</span>
                    <span>{(class67 / 100).toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- PRODUITS (Recettes) -->
        <div class="space-y-4 pl-0 md:pl-6 pt-6 md:pt-0">
          <h4 class="font-bold text-sm text-emerald-600 dark:text-emerald-400 border-b border-border pb-2 flex justify-between">
            <span>PRODUITS (Recettes)</span>
            <span>{(report.compteResultat.totalRecettes / 100).toFixed(2)} €</span>
          </h4>
          
          <div class="space-y-4">
            <!-- 70 - Ventes et prestations -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>70 - Vente de produits & prestations</span>
                <span>{(class70 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Ventes textiles et boites volants</span>
                  <span>{((cat8_recette + cat10_recette) / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Prestations cordages raquettes</span>
                  <span>{(cat7_recette / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Stages, buvettes et manifestations</span>
                  <span>{((cat5_recette + cat6_recette + cat13_recette) / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 74 - Subventions d'exploitation -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>74 - Subventions d'exploitation</span>
                <span>{(class74 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Subventions publiques & partenariats</span>
                  <span>{((cat3_recette + cat2_recette) / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 75 - Autres produits de gestion courante -->
            <div class="space-y-1.5">
              <div class="flex justify-between font-semibold text-sm">
                <span>75 - Autres produits de gestion courante</span>
                <span>{(class75 / 100).toFixed(2)} €</span>
              </div>
              <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                <div class="flex justify-between">
                  <span>• Cotisations club (inscriptions membres)</span>
                  <span>{(cat1_recette / 100).toFixed(2)} €</span>
                </div>
                <div class="flex justify-between">
                  <span>• Inscriptions championnats interclubs</span>
                  <span>{(cat12_recette / 100).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <!-- 77 - Produits exceptionnels -->
            {#if class77 > 0}
              <div class="space-y-1.5">
                <div class="flex justify-between font-semibold text-sm">
                  <span>77 - Produits exceptionnels</span>
                  <span>{(class77 / 100).toFixed(2)} €</span>
                </div>
                <div class="pl-4 space-y-1 text-xs text-muted-foreground">
                  <div class="flex justify-between">
                    <span>• Autres recettes administratives & divers</span>
                    <span>{(class77 / 100).toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            {/if}
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
