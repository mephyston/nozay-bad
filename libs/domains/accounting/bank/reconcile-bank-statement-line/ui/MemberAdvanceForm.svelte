<script lang="ts">
  import { Button, Input, FormField } from '@nba/ui';
  import type { BankStatementLine } from './reconciliation-types';

  /**
   * L'avance d'un adhérent : il a viré au club pour créditer son porte-monnaie.
   *
   * C'était le bouton « Adhérente », affiché sur toutes les lignes au crédit sans dire à quoi il
   * servait, et son dialogue. C'est désormais une nature de la ligne. Le montant et la date sont
   * ceux du relevé : il n'y a que le nom à donner. Le libellé proposé reprend celui de la banque,
   * où figure en général le nom de l'émetteur.
   */
  let {
    line,
    isSubmitting = false,
    isClosed = false,
    onConfirm
  }: {
    line: BankStatementLine;
    isSubmitting?: boolean;
    isClosed?: boolean;
    onConfirm: (description: string) => void;
  } = $props();

  let description = $state('');
  let ligneInitialisee: number | null = null;
  $effect(() => {
    if (ligneInitialisee === line.id) return;
    ligneInitialisee = line.id;
    description = `Reçu de ${line.name}`;
  });

  function submit(e: Event) {
    e.preventDefault();
    onConfirm(description);
  }
</script>

<form onsubmit={submit} class="space-y-4" data-testid="member-advance-form">
  <p class="text-xs text-muted-foreground">
    Ce n'est pas une recette : l'argent lui reste dû jusqu'à ce que le club crédite son porte-monnaie,
    depuis l'écran du porte-monnaie. Le virement s'écrit du compte d'attente des adhérents vers ce
    compte, et la ligne est pointée.
  </p>
  <FormField id="member-advance-description" label="Libellé (le nom de l'adhérent)">
    <Input id="member-advance-description" bind:value={description} required />
  </FormField>
  <Button type="submit" class="w-full font-bold" disabled={isClosed || isSubmitting || !description.trim()}>
    Enregistrer l'avance
  </Button>
</form>
