<script lang="ts">
  import { Wallet2, Check, Loader2, Save, AlertCircle } from "lucide-svelte";

  interface Season {
    id: string;
    name: string;
    closed?: boolean;
    isAutoFilled?: boolean;
    initialCurrentBalance?: number;
    initialSavingsBalance?: number;
    initialCashBalance?: number;
  }

  let { seasons = [], seasonId = '25-26' } = $props<{
    seasons: Season[];
    seasonId: string;
  }>();

  // svelte-ignore state_referenced_locally
  let selectedSeasonId = $state(seasonId);
  let currentInitial = $state('0.00');
  let savingsInitial = $state('0.00');
  let cashInitial = $state('0.00');
  
  let isSaving = $state(false);
  let successMsg = $state('');
  let errorMsg = $state('');

  const currentSeason = $derived(seasons.find((s: Season) => s.id === selectedSeasonId));
  const isClosed = $derived(currentSeason?.closed || false);
  const isAutoFilled = $derived(currentSeason?.isAutoFilled || false);

  // Update initial inputs when selected season changes
  $effect(() => {
    const season = seasons.find((s: Season) => s.id === selectedSeasonId);
    if (season) {
      currentInitial = season.initialCurrentBalance !== undefined ? (season.initialCurrentBalance / 100).toFixed(2) : '0.00';
      savingsInitial = season.initialSavingsBalance !== undefined ? (season.initialSavingsBalance / 100).toFixed(2) : '0.00';
      cashInitial = season.initialCashBalance !== undefined ? (season.initialCashBalance / 100).toFixed(2) : '0.00';
    } else {
      currentInitial = '0.00';
      savingsInitial = '0.00';
      cashInitial = '0.00';
    }
  });

  async function handleSaveBalances(e: SubmitEvent) {
    e.preventDefault();
    isSaving = true;
    errorMsg = '';
    successMsg = '';

    const payload = {
      seasonId: selectedSeasonId,
      balances: {
        current: Math.round(parseFloat(currentInitial) * 100),
        savings: Math.round(parseFloat(savingsInitial) * 100),
        cash: Math.round(parseFloat(cashInitial) * 100)
      }
    };

    try {
      const res = await fetch('/admin/compta/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Erreur lors de l\'enregistrement.');
      }

      successMsg = 'Les soldes initiaux ont été enregistrés avec succès !';
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="bg-card border border-border rounded-xl shadow-sm p-6 max-w-xl space-y-6">
  <div>
    <h2 class="text-lg font-bold flex items-center gap-2">
      <Wallet2 class="w-5 h-5 text-primary" />
      Soldes Initiaux de la Saison
    </h2>
    <p class="text-xs text-muted-foreground mt-1">
      Définissez l'état des comptes de l'association au premier jour de la saison comptable (1er septembre).
    </p>
  </div>

  {#if successMsg}
    <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-lg flex items-center gap-2">
      <Check class="w-4 h-4" />
      <span>{successMsg}</span>
    </div>
  {/if}

  {#if errorMsg}
    <div class="p-3 bg-destructive/10 border border-destructive text-destructive text-xs rounded-lg">
      {errorMsg}
    </div>
  {/if}

  {#if isClosed}
    <div class="p-3 bg-destructive/10 border border-destructive text-destructive text-xs rounded-lg flex items-center gap-2">
      <AlertCircle class="w-4 h-4 shrink-0" />
      <span>Cette saison est clôturée. Les soldes initiaux ne peuvent plus être modifiés.</span>
    </div>
  {/if}

  {#if !isClosed && isAutoFilled}
    <div class="p-3 bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs rounded-lg flex items-start gap-2">
      <span class="text-sm shrink-0">💡</span>
      <span>Les soldes ci-dessous ont été pré-remplis automatiquement à partir des soldes de fin de la saison précédente. Pensez à les valider en cliquant sur <strong>Enregistrer</strong>.</span>
    </div>
  {/if}

  <form onsubmit={handleSaveBalances} class="space-y-4">
    <div>
      <label for="season-select-config" class="block text-xs font-semibold mb-1 uppercase tracking-wider text-muted-foreground">Saison à configurer</label>
      <select 
        id="season-select-config" 
        class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium" 
        bind:value={selectedSeasonId}
      >
        {#each seasons as s}
          <option value={s.id}>{s.name}</option>
        {/each}
        {#if seasons.length === 0}
          <option value="25-26">Saison 2025-2026</option>
        {/if}
      </select>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="space-y-1">
        <label for="current-initial" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compte Courant</label>
        <div class="relative">
          <input 
            id="current-initial" 
            type="number" 
            step="0.01" 
            class="w-full pl-3 pr-6 py-2 border border-border bg-background rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold disabled:opacity-60 disabled:cursor-not-allowed" 
            bind:value={currentInitial} 
            required
            disabled={isClosed}
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
        </div>
      </div>

      <div class="space-y-1">
        <label for="savings-initial" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compte Livret</label>
        <div class="relative">
          <input 
            id="savings-initial" 
            type="number" 
            step="0.01" 
            class="w-full pl-3 pr-6 py-2 border border-border bg-background rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold disabled:opacity-60 disabled:cursor-not-allowed" 
            bind:value={savingsInitial} 
            required
            disabled={isClosed}
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
        </div>
      </div>

      <div class="space-y-1">
        <label for="cash-initial" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caisse physique</label>
        <div class="relative">
          <input 
            id="cash-initial" 
            type="number" 
            step="0.01" 
            class="w-full pl-3 pr-6 py-2 border border-border bg-background rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-semibold disabled:opacity-60 disabled:cursor-not-allowed" 
            bind:value={cashInitial} 
            required
            disabled={isClosed}
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
        </div>
      </div>
    </div>

    {#if !isClosed}
      <div class="pt-4 border-t border-border flex justify-end">
        <button 
          type="submit" 
          disabled={isSaving} 
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-md shadow cursor-pointer border-0"
        >
          {#if isSaving}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
            Enregistrement...
          {:else}
            <Save class="w-3.5 h-3.5" />
            Enregistrer les soldes
          {/if}
        </button>
      </div>
    {/if}
  </form>
</div>
