<script lang="ts">
  import { Check, Banknote, Landmark, Copy } from '@lucide/svelte';
  import { Dialog, Button, Amount } from '@nba/ui';
  import type { OrderConfirmation } from './catalog-types';
  import { CLUB_BANK_DETAILS, paymentMethodLabel, requiresBankTransfer, requiresCashHandover } from './catalog-utils';

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
    onAcknowledge,
    historyHref = null
  }: {
    /** Commande à confirmer ; `null` ferme la boîte. */
    confirmation: OrderConfirmation | null;
    /** Appelé une fois la boîte fermée, quel qu'en soit le geste. */
    onAcknowledge: () => void;
    /** Adresse de l'historique des commandes, proposée en sortie de boîte ; `null` la tait. */
    historyHref?: string | null;
  } = $props();

  const open = $derived(confirmation !== null);
  const cash = $derived(confirmation !== null && requiresCashHandover(confirmation.paymentMethod));
  const transfer = $derived(confirmation !== null && requiresBankTransfer(confirmation.paymentMethod));

  /** Champ bancaire copié à l'instant, pour faire clignoter la coche deux secondes. */
  let copiedField = $state<string | null>(null);

  /**
   * Copie une coordonnée bancaire. L'IBAN part sans ses espaces : les applications
   * bancaires les acceptent rarement dans le champ de saisie.
   */
  async function copyBankField(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(field === 'iban' ? value.replace(/\s+/g, '') : value);
      copiedField = field;
      setTimeout(() => {
        if (copiedField === field) copiedField = null;
      }, 2000);
    } catch (err) {
      console.error('Copie impossible', err);
    }
  }

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

      {#if transfer}
        <!-- Sans les coordonnées sous les yeux, le virement attend le prochain passage au gymnase. -->
        <div
          class="flex items-start gap-2.5 rounded-xl border border-info/40 bg-info/10 p-3 text-sm text-foreground"
          data-testid="bank-transfer-details"
        >
          <Landmark class="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <div class="min-w-0 space-y-1">
            <p>
              Paiement par virement : virez
              <Amount cents={confirmation.totalCents} class="font-bold" />
              sur le compte du club.
            </p>
            <!--
              Le libellé est la seule trace de l'achat sur le relevé : sans lui, le
              trésorier rapproche à l'aveugle. On le propose tout fait, prêt à copier.
            -->
            <p data-testid="bank-transfer-reference-hint">
              Merci d'indiquer le motif de l'achat en référence du virement (article, nom et
              prénom) : le trésorier retrouve ainsi votre paiement sur le relevé.
            </p>
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {#each [
                { field: 'holder', label: 'Titulaire', value: CLUB_BANK_DETAILS.holder, mono: false },
                { field: 'iban', label: 'IBAN', value: CLUB_BANK_DETAILS.iban, mono: true },
                { field: 'bic', label: 'BIC', value: CLUB_BANK_DETAILS.bic, mono: true },
                { field: 'reference', label: 'Motif', value: confirmation.transferReference, mono: false }
              ] as item (item.field)}
                <dt class="self-center text-muted-foreground">{item.label}</dt>
                <dd class="flex min-w-0 items-center gap-1.5">
                  <span class="font-semibold break-all {item.mono ? 'font-mono tabular-nums' : ''}">{item.value}</span>
                  <button
                    type="button"
                    class="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onclick={() => copyBankField(item.field, item.value)}
                    title="Copier : {item.label}"
                    aria-label="Copier : {item.label}"
                  >
                    {#if copiedField === item.field}
                      <Check class="h-3.5 w-3.5 text-success" />
                    {:else}
                      <Copy class="h-3.5 w-3.5" />
                    {/if}
                  </button>
                </dd>
              {/each}
            </dl>
          </div>
        </div>
      {/if}
    {/if}

    <Dialog.Footer class="gap-2">
      {#if historyHref}
        <!-- La commande vient d'être enregistrée : c'est là qu'on voudra la suivre. -->
        <Button variant="outline" class="w-full sm:w-auto" href={historyHref}>Voir mon historique de commandes</Button>
      {/if}
      <Button class="w-full sm:w-auto" onclick={() => handleOpenChange(false)}>OK</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
