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

  let { report, seasonId, seasons = [] }: { report: ReportData; seasonId: string; seasons?: Season[] } = $props();

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);

  const categories: Record<string, string> = {
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
    <h3 class="text-lg font-semibold">1. Compte de Résultat</h3>
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
                <span class="text-muted-foreground">{categories[key as keyof typeof categories] || key}</span>
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
                <span class="text-muted-foreground">{categories[key as keyof typeof categories] || key}</span>
                <span class="font-semibold">{(cat.total / 100).toFixed(2)} €</span>
              </div>
            {/if}
          {:else}
            <div class="text-xs text-muted-foreground italic">Aucune dépense enregistrée.</div>
          {/each}
        </div>
      </div>
    </div>

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
