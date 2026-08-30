<script lang="ts">
  import { Button, Input, FormField } from '@nba/ui';

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
    <div class="bg-info/10 border border-info/20 p-4 rounded-lg space-y-2">
    <div class="text-xs text-info font-bold uppercase tracking-wider">Récapitulatif de la sélection</div>
    <div class="flex justify-between items-center text-xs">
      <span class="text-muted-foreground font-medium">Chèques sélectionnés :</span>
      <span class="text-foreground font-bold">{selectedChecksList.length}</span>
    </div>
    <div class="flex justify-between items-center text-xs border-t pt-2">
      <span class="text-muted-foreground font-medium">Montant total de la remise :</span>
      <span class="text-foreground font-bold">{(totalSelectedAmount / 100).toFixed(2)} €</span>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField id="dep-ref" label="Référence remise">
      <Input id="dep-ref" bind:value={depositReference} class="w-full" />
      </FormField>
      <FormField id="dep-date" label="Date de remise">
      <Input id="dep-date" type="date" bind:value={depositDate} class="w-full" />
    </FormField>
  </div>

  <Button
    onclick={onCreateDeposit}
    disabled={isSubmittingDeposit || !depositReference || selectedChecksList.length === 0}
    class="w-full"
  >
    {isSubmittingDeposit ? 'Création en cours...' : 'Créer la remise de chèques'}
  </Button>
</div>
