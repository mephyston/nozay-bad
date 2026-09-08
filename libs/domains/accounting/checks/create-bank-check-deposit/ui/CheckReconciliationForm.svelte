<script lang="ts">
  import { Button, FormField, SearchableCombobox } from '@nba/ui';

  let {
    selectedDepositToClear,
    pendingBankTransactions = [],
    selectedBankTransactionId = $bindable(''),
    isSubmittingClear = false,
    onClearDeposit
  }: {
    selectedDepositToClear: any;
    pendingBankTransactions: any[];
    selectedBankTransactionId: string;
    isSubmittingClear: boolean;
    onClearDeposit: () => void;
  } = $props();

  let matchingBankTxs = $derived(
    pendingBankTransactions.filter(
      bt => bt.amount === selectedDepositToClear?.amount
    )
  );
</script>

<div class="space-y-4 text-sm">
  <div class="bg-muted space-y-1 rounded-lg border p-3 text-xs">
    <div>
      <span class="text-muted-foreground font-medium">Remise :</span>
      <span class="text-foreground font-semibold">{selectedDepositToClear?.reference}</span>
    </div>
    <div>
      <span class="text-muted-foreground font-medium">Montant :</span>
      <span class="text-foreground font-bold">{(selectedDepositToClear?.amount / 100).toFixed(2)} €</span>
    </div>
  </div>

  <!--
    Seules les lignes du montant exact : une remise est une seule opération bancaire, et le
    serveur refuse tout autre montant. Une ligne différente est une autre opération — ou une
    remise dont la banque a rejeté un chèque, ce qui se corrige sur le bordereau.
  -->
  <FormField id="bank-tx-select" label="Ligne du relevé portant la remise">
    <SearchableCombobox
      id="bank-tx-select"
      placeholder="-- Choisir une ligne de relevé bancaire --"
      bind:value={selectedBankTransactionId}
      items={matchingBankTxs.map((bt) => ({ label: `${bt.date} • ${bt.name} • ${(bt.amount / 100).toFixed(2)} €`, value: String(bt.id) }))}
    />
  </FormField>
  {#if matchingBankTxs.length === 0}
    <p class="text-xs text-muted-foreground">
      Aucune ligne en attente ne porte ce montant : le relevé n'est peut-être pas encore importé,
      ou la banque a rejeté un chèque de la remise.
    </p>
  {/if}

  <Button
    onclick={onClearDeposit}
    disabled={isSubmittingClear || !selectedBankTransactionId}
    class="w-full"
  >
    {isSubmittingClear ? 'Validation...' : 'Valider l\'encaissement'}
  </Button>
</div>
