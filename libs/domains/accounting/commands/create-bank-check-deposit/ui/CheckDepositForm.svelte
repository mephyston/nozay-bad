<script lang="ts">
  import { Button, Input } from '@metacult/shared-ui';

  let {
    selectedChecksList = [],
    totalSelectedAmount = 0,
    depositReference = $bindable(''),
    depositDate = $bindable(''),
    isSubmittingDeposit = false,
    onCreateDeposit
  }: {
    selectedChecksList: any[];
    totalSelectedAmount: number;
    depositReference: string;
    depositDate: string;
    isSubmittingDeposit: boolean;
    onCreateDeposit: () => void;
  } = $props();
</script>

<div class="space-y-4 text-sm">
  <div class="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-2">
    <div class="text-xs text-blue-700 font-bold uppercase tracking-wider">Récapitulatif de la sélection</div>
    <div class="flex justify-between items-center text-xs">
      <span class="text-gray-500 font-medium">Chèques sélectionnés :</span>
      <span class="font-bold text-gray-900">{selectedChecksList.length}</span>
    </div>
    <div class="flex justify-between items-center text-xs border-t pt-2">
      <span class="text-gray-500 font-medium">Montant total de la remise :</span>
      <span class="font-bold text-gray-900">{(totalSelectedAmount / 100).toFixed(2)} €</span>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div class="space-y-1">
      <label for="dep-ref" class="block text-xs font-bold text-gray-500 uppercase tracking-wider">Référence remise</label>
      <Input id="dep-ref" bind:value={depositReference} class="w-full" />
    </div>
    <div class="space-y-1">
      <label for="dep-date" class="block text-xs font-bold text-gray-500 uppercase tracking-wider">Date de remise</label>
      <Input id="dep-date" type="date" bind:value={depositDate} class="w-full" />
    </div>
  </div>

  <Button
    onclick={onCreateDeposit}
    disabled={isSubmittingDeposit || !depositReference || selectedChecksList.length === 0}
    class="w-full"
  >
    {isSubmittingDeposit ? 'Création en cours...' : 'Créer la remise de chèques'}
  </Button>
</div>
