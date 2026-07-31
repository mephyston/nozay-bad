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
  <div class="bg-gray-50 border p-3 rounded-lg text-xs space-y-1">
    <div>
      <span class="text-gray-500 font-medium">Remise :</span>
      <span class="font-semibold text-gray-800">{selectedDepositToClear?.reference}</span>
    </div>
    <div>
      <span class="text-gray-500 font-medium">Montant :</span>
      <span class="font-bold text-gray-900">{(selectedDepositToClear?.amount / 100).toFixed(2)} €</span>
    </div>
  </div>

    <FormField id="bank-tx-select" label="Sélectionner la ligne bancaire correspondante">
    <SearchableCombobox
      id="bank-tx-select"
      placeholder="-- Choisir une ligne de relevé bancaire --"
      bind:value={selectedBankTransactionId}
      items={[
        ...matchingBankTxs.map((bt) => ({ label: `${bt.date} • ${bt.name} • ${(bt.amount / 100).toFixed(2)} €`, value: String(bt.id) })),
        ...pendingBankTransactions.filter((bt) => bt.amount !== selectedDepositToClear?.amount).map((bt) => ({ label: `${bt.date} • ${bt.name} • ${(bt.amount / 100).toFixed(2)} € (Montant différent)`, value: String(bt.id) }))
      ]}
    />
  </FormField>

  <Button
    onclick={onClearDeposit}
    disabled={isSubmittingClear || !selectedBankTransactionId}
    class="w-full"
  >
    {isSubmittingClear ? 'Validation...' : 'Valider l\'encaissement'}
  </Button>
</div>
