<script lang="ts">
  import { ArrowLeftRight } from '@lucide/svelte';
  import { Button, Dialog, Input, FormField, Amount, SearchableCombobox } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /**
   * Un virement entre deux comptes du club, depuis sa ligne de relevé.
   *
   * Le montant, la date et le sens sont ceux de la ligne : il n'y a que le compte d'en face à
   * choisir, et le libellé à confirmer. Le dialogue dit d'avance ce qu'il fera de l'autre
   * relevé — pointer la ligne qui répond, ou la laisser à associer — pour que le geste ne
   * réserve pas de surprise.
   */
  let {
    open = $bindable(false),
    state: reconState,
    line,
    onConfirm
  }: {
    open: boolean;
    state: ReconciliationState;
    line: BankStatementLine;
    onConfirm: (counterpartAccountId: string, description: string) => void;
  } = $props();

  const cents = $derived((line as any).amountCents ?? line.amount ?? 0);
  const isDebit = $derived(cents < 0);
  const ownAccount = $derived(reconState.accountOf(line.accountId));
  const counterparts = $derived(reconState.transferCounterpartsFor(line));
  const items = $derived(counterparts.map((a) => ({ label: a.label, value: String(a.id) })));

  let counterpartId = $state('');
  let description = $state('');

  $effect(() => {
    if (open) {
      description = line.name;
      counterpartId = counterparts.length === 1 ? String(counterparts[0].id) : '';
    }
  });

  const counterpart = $derived(counterparts.find((a) => String(a.id) === counterpartId));
  const otherLine = $derived(counterpart ? reconState.findTransferCounterpartLine(line, counterpart.id) : null);

  function submit(e: Event) {
    e.preventDefault();
    if (!counterpartId) return;
    onConfirm(counterpartId, description);
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md p-6">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-lg font-bold">
        <ArrowLeftRight class="h-5 w-5 text-primary" />
        Virement interne
      </Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground mt-1">
        {#if isDebit}
          <strong><Amount cents={-cents} /></strong> ont quitté {ownAccount?.label ?? 'ce compte'} le {line.date}.
          Le virement s'écrit en deux jambes, une par compte, et celle-ci est pointée dans la foulée.
        {:else}
          <strong><Amount {cents} /></strong> sont arrivés sur {ownAccount?.label ?? 'ce compte'} le {line.date}.
          Le virement s'écrit en deux jambes, une par compte, et celle-ci est pointée dans la foulée.
        {/if}
        Ce n'est ni une recette ni une dépense : il ne pèse pas sur le résultat.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={submit} class="mt-4 space-y-4">
      <FormField id="internal-transfer-counterpart" label={isDebit ? "Compte d'arrivée" : 'Compte de départ'}>
        <SearchableCombobox id="internal-transfer-counterpart" {items} bind:value={counterpartId} placeholder="Choisir un compte" />
      </FormField>

      {#if counterpart}
        <p class="text-xs text-muted-foreground" data-testid="counterpart-verdict">
          {#if otherLine}
            Le relevé de <strong>{counterpart.label}</strong> porte la ligne qui répond ({otherLine.date},
            <Amount cents={(otherLine as any).amountCents ?? otherLine.amount ?? 0} />) : elle sera pointée en même temps.
          {:else}
            Aucune ligne seule ne répond sur le relevé de <strong>{counterpart.label}</strong> — parce qu'il n'est pas
            encore importé, que c'est une caisse, ou que plusieurs lignes correspondent. Sa jambe restera à
            associer depuis ce compte.
          {/if}
        </p>
      {/if}

      <FormField id="internal-transfer-description" label="Libellé">
        <Input id="internal-transfer-description" bind:value={description} required />
      </FormField>
      <div class="flex justify-end gap-2">
        <Button type="button" variant="outline" onclick={() => (open = false)}>Annuler</Button>
        <Button type="submit" disabled={reconState.isSubmitting || !counterpartId || !description.trim()}>Enregistrer et pointer</Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>
