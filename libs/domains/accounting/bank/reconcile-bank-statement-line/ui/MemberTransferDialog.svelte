<script lang="ts">
  import { HandCoins } from '@lucide/svelte';
  import { Button, Dialog, Input, FormField, Amount } from '@nba/ui';
  import type { BankStatementLine } from './reconciliation-types';

  /**
   * Le virement reçu d'une adhérente, depuis sa ligne de relevé.
   *
   * Le montant et la date sont ceux de la ligne : il n'y a que le nom à donner. Le libellé
   * proposé reprend celui de la banque, où figure en général le nom de l'émettrice.
   */
  let {
    open = $bindable(false),
    line,
    isSubmitting = false,
    onConfirm
  }: {
    open: boolean;
    line: BankStatementLine;
    isSubmitting?: boolean;
    onConfirm: (description: string) => void;
  } = $props();

  const cents = $derived((line as any).amountCents ?? line.amount ?? 0);
  let description = $state('');

  $effect(() => {
    if (open) description = `Reçu de ${line.name}`;
  });

  function submit(e: Event) {
    e.preventDefault();
    onConfirm(description);
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md p-6">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-lg font-bold">
        <HandCoins class="h-5 w-5 text-primary" />
        Virement reçu d'une adhérente
      </Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground mt-1">
        Elle a viré <strong><Amount {cents} /></strong> le {line.date} pour que le club crédite son porte-monnaie.
        Ce n'est pas une recette : l'argent est à lui rendre. Le virement s'écrit du compte d'attente des adhérents
        vers le compte courant, et la ligne du relevé est pointée dans la foulée.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={submit} class="mt-4 space-y-4">
      <FormField id="member-transfer-description" label="Libellé (le nom de l'adhérente)">
        <Input id="member-transfer-description" bind:value={description} required />
      </FormField>
      <div class="flex justify-end gap-2">
        <Button type="button" variant="outline" onclick={() => (open = false)}>Annuler</Button>
        <Button type="submit" disabled={isSubmitting || !description.trim()}>Enregistrer et pointer</Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>
