<script lang="ts">
  import { Button, Input, FormField, Amount, SearchableCombobox } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /**
   * Un virement entre deux comptes du club, depuis sa ligne de relevé.
   *
   * C'était un dialogue ouvert par un bouton de la ligne ; c'est désormais le formulaire de la
   * nature « Virement entre nos comptes », dans le panneau. Le montant, la date et le sens sont
   * ceux de la ligne : il n'y a que le compte d'en face à choisir, et le libellé à confirmer. Le
   * formulaire dit d'avance ce qu'il fera de l'autre relevé — pointer la ligne qui répond, ou la
   * laisser à associer — pour que le geste ne réserve pas de surprise.
   */
  let {
    state: reconState,
    line,
    onConfirm
  }: {
    state: ReconciliationState;
    line: BankStatementLine;
    onConfirm: (counterpartAccountId: string, description: string) => void;
  } = $props();

  const cents = $derived((line as any).amountCents ?? line.amount ?? 0);
  const isDebit = $derived(cents < 0);
  const counterparts = $derived(reconState.transferCounterpartsFor(line));
  const items = $derived(counterparts.map((a) => ({ label: a.label, value: String(a.id) })));

  let counterpartId = $state('');
  let description = $state('');

  /* Repris à chaque ligne ouverte : le libellé de la banque, et le seul compte possible s'il n'y en a qu'un. */
  let ligneInitialisee: number | null = null;
  $effect(() => {
    if (ligneInitialisee === line.id) return;
    ligneInitialisee = line.id;
    description = line.name;
    counterpartId = counterparts.length === 1 ? String(counterparts[0].id) : '';
  });

  const counterpart = $derived(counterparts.find((a) => String(a.id) === counterpartId));
  const otherLine = $derived(counterpart ? reconState.findTransferCounterpartLine(line, counterpart.id) : null);

  function submit(e: Event) {
    e.preventDefault();
    if (!counterpartId) return;
    onConfirm(counterpartId, description);
  }
</script>

<form onsubmit={submit} class="space-y-4" data-testid="internal-transfer-form">
  <FormField id="internal-transfer-counterpart" label={isDebit ? "Compte qui reçoit l'argent" : "Compte d'où vient l'argent"}>
    <SearchableCombobox id="internal-transfer-counterpart" {items} bind:value={counterpartId} placeholder="Choisir un compte" />
  </FormField>

  {#if counterpart}
    <p class="text-xs text-muted-foreground" data-testid="counterpart-verdict">
      Le virement s'écrit en deux jambes, une par compte, et celle de cette ligne est pointée.
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

  <Button
    type="submit"
    class="w-full font-bold"
    disabled={reconState.isClosed || reconState.isSubmitting || !counterpartId || !description.trim()}
  >
    Enregistrer le virement
  </Button>
</form>
