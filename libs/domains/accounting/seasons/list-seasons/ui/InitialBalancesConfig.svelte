<script lang="ts">
  import { Loader2, Save, AlertCircle } from "@lucide/svelte";
  import { Button, AmountInput, Alert, FormField } from "@nba/ui";
  import { runSettingsAction, type SettingsState } from './settings-api-classes';
  import type { Season, SeasonInitialBalance } from './settings-types';

  let { seasons = [], seasonId = '25-26' } = $props<{
    seasons: Season[];
    seasonId: string;
  }>();

  const findSeason = (list: Season[], id: string) =>
    list.find((s: Season) => s.id === id || s.code === id || String(s.id) === id);

  /** Les soldes en euros, par code de compte, tels que l'exercice les donne. */
  const eurosOf = (season: Season | undefined): Record<string, number> => {
    const next: Record<string, number> = {};
    for (const b of season?.initialBalances ?? []) next[b.accountId] = (b.initialBalanceCents ?? 0) / 100;
    return next;
  };

  /*
    La saisie, en euros, par code de compte. Remplie dès l'initialisation, et non dans un
    effet : un champ lié à une clé encore absente refuse de se monter.
  */
  let values = $state<Record<string, number>>(eurosOf(findSeason(seasons, seasonId)));
  let viewState = $state<SettingsState>({ errorMsg: '', isSubmitting: false });

  const currentSeason = $derived(findSeason(seasons, seasonId));
  const isClosed = $derived(currentSeason?.closed || false);
  const isAutoFilled = $derived(currentSeason?.isAutoFilled || false);

  /*
    Un champ par compte de trésorerie, dans l'ordre où le relais les donne. L'écran ne
    connaît aucun compte par son nom : le porte-monnaie Badnet y est entré sans qu'une
    ligne d'ici ne change.
  */
  const balances = $derived<SeasonInitialBalance[]>(currentSeason?.initialBalances ?? []);

  // Changer d'exercice recharge la saisie ; une saisie en cours n'y survit pas, comme avant.
  $effect(() => {
    values = eurosOf(currentSeason);
  });

  async function handleSaveBalances(e: SubmitEvent) {
    e.preventDefault();
    /*
      Un tableau d'un solde par compte, ce que l'API attend. L'ancien envoi — un objet à trois
      clés, vers une adresse de relais qui n'existait pas — n'enregistrait rien.
    */
    await runSettingsAction(viewState, {
      body: {
        action: 'update_balances',
        seasonId,
        balances: balances.map((b) => ({
          accountId: b.accountId,
          initialBalanceCents: Math.round((values[b.accountId] ?? 0) * 100)
        }))
      },
    });
  }
</script>

<div class="space-y-6">
    {#if viewState.errorMsg}
      <Alert.Root variant="destructive">
        <AlertCircle class="w-4 h-4" />
        <Alert.Description>{viewState.errorMsg}</Alert.Description>
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
      {#if balances.length === 0}
        <p class="text-sm text-muted-foreground">Aucun compte de trésorerie à reporter pour cet exercice.</p>
      {/if}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each balances as balance (balance.accountId)}
          <FormField id="{balance.accountId}-initial" label={balance.thirdParty ? `${balance.label} (dette, négatif)` : balance.label}>
            <AmountInput
              id="{balance.accountId}-initial"
              bind:value={values[balance.accountId]}
              required
              disabled={isClosed}
            />
          </FormField>
        {/each}
      </div>

      {#if !isClosed && balances.length > 0}
        <div class="pt-4 border-t border-border flex justify-end">
          <Button
            type="submit"
            disabled={viewState.isSubmitting}
            size="sm"
          >
            {#if viewState.isSubmitting}
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
