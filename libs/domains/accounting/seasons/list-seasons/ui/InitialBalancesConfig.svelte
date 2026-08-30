<script lang="ts">
  import { Wallet2, Loader2, Save, AlertCircle } from "@lucide/svelte";
  import { Button, AmountInput, Alert, FormField, submitForm } from "@nba/ui";

  interface Season {
    id: string;
    code?: string;
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

  let currentInitial = $state(0);
  let savingsInitial = $state(0);
  let cashInitial = $state(0);
  
  let isSaving = $state(false);
  let errorMsg = $state('');

  const currentSeason = $derived(seasons.find((s: Season) => s.id === seasonId || s.code === seasonId || String(s.id) === seasonId));
  const isClosed = $derived(currentSeason?.closed || false);
  const isAutoFilled = $derived(currentSeason?.isAutoFilled || false);



  // Update initial inputs when seasonId changes
  $effect(() => {
    const season = seasons.find((s: Season) => s.id === seasonId || s.code === seasonId || String(s.id) === seasonId);
    if (season) {
      currentInitial = season.initialCurrentBalance !== undefined ? season.initialCurrentBalance / 100 : 0;
      savingsInitial = season.initialSavingsBalance !== undefined ? season.initialSavingsBalance / 100 : 0;
      cashInitial = season.initialCashBalance !== undefined ? season.initialCashBalance / 100 : 0;
    } else {
      currentInitial = 0;
      savingsInitial = 0;
      cashInitial = 0;
    }
  });

  async function handleSaveBalances(e: SubmitEvent) {
    e.preventDefault();
    isSaving = true;
    errorMsg = '';

    const payload = {
      action: 'update_balances',
      seasonId,
      balances: {
        current: Math.round(currentInitial * 100),
        savings: Math.round(savingsInitial * 100),
        cash: Math.round(cashInitial * 100)
      }
    };

    await submitForm({
      submit: async () => {
        // L'adresse unique d'écriture de la rubrique, et non la page hôte.
        const res = await fetch('/admin/api/settings/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text() || 'Erreur lors de l\'enregistrement.');
      },
      success: 'Soldes initiaux enregistrés.',
      onError: (message) => { errorMsg = message; }
    });

    isSaving = false;
  }
</script>

<div class="space-y-6">
    {#if errorMsg}
      <Alert.Root variant="destructive">
        <AlertCircle class="w-4 h-4" />
        <Alert.Description>{errorMsg}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if isClosed}
      <Alert.Root variant="destructive">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <Alert.Description>Cette saison est clôturée. Les soldes initiaux ne peuvent plus être modifiés.</Alert.Description>
      </Alert.Root>
    {/if}

    {#if !isClosed && isAutoFilled}
      <Alert.Root variant="info">
        <span class="text-sm shrink-0">💡</span>
        <Alert.Description>Les soldes ci-dessous ont été pré-remplis automatiquement à partir des soldes de fin de la saison précédente. Pensez à les valider en cliquant sur <strong>Enregistrer</strong>.</Alert.Description>
      </Alert.Root>
    {/if}

    <form onsubmit={handleSaveBalances} class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField id="current-initial" label="Compte Courant">
          <AmountInput 
            id="current-initial" 
            bind:value={currentInitial} 
            required
            disabled={isClosed}
          />
        </FormField>

          <FormField id="savings-initial" label="Compte Livret">
          <AmountInput 
            id="savings-initial" 
            bind:value={savingsInitial} 
            required
            disabled={isClosed}
          />
        </FormField>

          <FormField id="cash-initial" label="Caisse physique">
          <AmountInput 
            id="cash-initial" 
            bind:value={cashInitial} 
            required
            disabled={isClosed}
          />
        </FormField>
      </div>

      {#if !isClosed}
        <div class="pt-4 border-t border-border flex justify-end">
          <Button 
            type="submit" 
            disabled={isSaving} 
            size="sm"
          >
            {#if isSaving}
              <Loader2 class="w-3.5 h-3.5 animate-spin" />
              Enregistrement...
            {:else}
              <Save class="w-3.5 h-3.5" />
              Enregistrer les soldes
            {/if}
          </Button>
        </div>
      {/if}
    </form>
</div>
