<script lang="ts">
  import { Check, Banknote } from '@lucide/svelte';
  import { Dialog, Button, Amount } from '@nba/ui';
  import type { OrderConfirmation } from './catalog-types';
  import { paymentMethodLabel, requiresCashHandover } from './catalog-utils';

  /**
   * Accusé de réception d'une commande, en boîte modale.
   *
   * L'enregistrement se signalait par un encart vert glissé sous le bouton : sur
   * mobile il tombait sous la ligne de flottaison, et rien ne distinguait une
   * commande enregistrée d'un formulaire encore rempli. Une modale, elle, doit être
   * fermée — et c'est cette fermeture qui remet le formulaire à zéro, quel que soit
   * le geste employé (bouton, croix, Échap, clic hors cadre).
   */
  let {
    confirmation = $bindable(null),
    onAcknowledge
  }: {
    /** Commande à confirmer ; `null` ferme la boîte. */
    confirmation: OrderConfirmation | null;
    /** Appelé une fois la boîte fermée, quel qu'en soit le geste. */
    onAcknowledge: () => void;
  } = $props();

  const open = $derived(confirmation !== null);
  const cash = $derived(confirmation !== null && requiresCashHandover(confirmation.paymentMethod));

  function handleOpenChange(next: boolean) {
    if (next) return;
    confirmation = null;
    onAcknowledge();
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md" data-testid="order-confirmation">
    <Dialog.Header>
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Check class="h-5 w-5" />
        </span>
        <Dialog.Title class="text-base font-semibold">Commande enregistrée</Dialog.Title>
      </div>
      <Dialog.Description class="pt-1 text-sm text-muted-foreground">
        Elle sera comptabilisée dès validation par le trésorier.
      </Dialog.Description>
    </Dialog.Header>

    {#if confirmation}
      <div class="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <div class="flex items-start justify-between gap-3">
          <span class="text-muted-foreground">Adhérent</span>
          <span class="text-right font-semibold text-foreground">{confirmation.memberName}</span>
        </div>
        <div class="flex items-start justify-between gap-3">
          <span class="text-muted-foreground">Article</span>
          <span class="text-right font-semibold text-foreground">{confirmation.quantity} × {confirmation.productName}</span>
        </div>
        <div class="flex items-start justify-between gap-3">
          <span class="text-muted-foreground">Paiement</span>
          <span class="text-right font-semibold text-foreground">{paymentMethodLabel(confirmation.paymentMethod)}</span>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-border/50 pt-2">
          <span class="font-bold text-foreground">Montant total</span>
          <Amount cents={confirmation.totalCents} class="text-lg font-extrabold text-primary" />
        </div>
      </div>

      {#if cash}
        <!--
          Le paiement en espèces est le seul mode qui demande encore un geste hors de
          l'écran : sans cette phrase, l'adhérent repart en croyant avoir payé.
        -->
        <div class="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <Banknote class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            Paiement en espèces : remettez le montant de
            <Amount cents={confirmation.totalCents} class="font-bold" />
            à votre entraîneur ou au trésorier.
          </p>
        </div>
      {/if}
    {/if}

    <Dialog.Footer>
      <Button class="w-full sm:w-auto" onclick={() => handleOpenChange(false)}>OK</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
