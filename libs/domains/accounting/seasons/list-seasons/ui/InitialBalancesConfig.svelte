<script lang="ts">
  import { Wallet2, Check, Loader2, Save, AlertCircle } from "@lucide/svelte";
  import { Button, Input, Card, Alert, FormField } from"@nba/ui";

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

  let currentInitial = $state('0.00');
  let savingsInitial = $state('0.00');
  let cashInitial = $state('0.00');
  
  let isSaving = $state(false);
  let successMsg = $state('');
  let errorMsg = $state('');

  const currentSeason = $derived(seasons.find((s: Season) => s.id === seasonId || s.code === seasonId || String(s.id) === seasonId));
  const isClosed = $derived(currentSeason?.closed || false);
  const isAutoFilled = $derived(currentSeason?.isAutoFilled || false);

  // Update initial inputs when seasonId changes
  $effect(() => {
    const season = seasons.find((s: Season) => s.id === seasonId || s.code === seasonId || String(s.id) === seasonId);
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
      seasonId,
      balances: {
        current: Math.round(parseFloat(currentInitial) * 100),
        savings: Math.round(parseFloat(savingsInitial) * 100),
        cash: Math.round(parseFloat(cashInitial) * 100)
      }
    };

    try {
      const res = await fetch('/admin/accounting/config', {
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
    } catch (err: unknown) {
      errorMsg = err.message || 'Une erreur est survenue.';
    } finally {
      isSaving = false;
    }
  }
</script>

<Card.Root class="max-w-xl">
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      <Wallet2 class="w-5 h-5 text-primary" />
      Soldes Initiaux de la Saison
    </Card.Title>
    <Card.Description>
      Définissez l'état des comptes de l'association au premier jour de la saison comptable (1er septembre).
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-6">
    {#if successMsg}
      <Alert.Root variant="success">
        <Check class="w-4 h-4" />
        <Alert.Description>{successMsg}</Alert.Description>
      </Alert.Root>
    {/if}

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
          <div class="relative">
            <Input 
              id="current-initial" 
              type="number" 
              step="0.01" 
              class="pl-3 pr-6 text-foreground font-semibold font-outfit tabular-nums" 
              bind:value={currentInitial} 
              required
              disabled={isClosed}
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
          </div>
        </FormField>

          <FormField id="savings-initial" label="Compte Livret">
          <div class="relative">
            <Input 
              id="savings-initial" 
              type="number" 
              step="0.01" 
              class="pl-3 pr-6 text-foreground font-semibold font-outfit tabular-nums" 
              bind:value={savingsInitial} 
              required
              disabled={isClosed}
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
          </div>
        </FormField>

          <FormField id="cash-initial" label="Caisse physique">
          <div class="relative">
            <Input 
              id="cash-initial" 
              type="number" 
              step="0.01" 
              class="pl-3 pr-6 text-foreground font-semibold font-outfit tabular-nums" 
              bind:value={cashInitial} 
              required
              disabled={isClosed}
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
          </div>
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
  </Card.Content>
</Card.Root>
