<script lang="ts">
  import { X } from '@lucide/svelte';
  import { FormField, FormSheet, Textarea } from '@nba/ui';
  import type { OrderItem } from './orders-manager-types';
  import { nomAdherent } from './orders-row-model';
  import { REJECTION_REASON_MAX_LENGTH } from '../../shared/order';

  /**
   * Refuser une commande, en disant pourquoi.
   *
   * Remplace la simple question « Êtes-vous sûr ? » : l'adhérent recevait une
   * notification qui le renvoyait vers le bureau, sans rien lui dire. Le motif reste
   * facultatif — un doublon évident n'a pas besoin d'explication —, mais il est
   * proposé à chaque refus, et la feuille tient lieu de confirmation.
   */
  let {
    open = $bindable(false),
    item = null,
    onReject
  }: {
    open?: boolean;
    item?: OrderItem | null;
    /** Renvoie un message d'erreur, ou `null` si le refus est passé. */
    onReject: (orderId: number, reason: string) => Promise<string | null>;
  } = $props();

  let reason = $state('');
  let error = $state<string | null>(null);
  let isSubmitting = $state(false);

  // Chaque ouverture repart d'une feuille vierge : le motif d'une commande ne doit pas
  // resservir pour la suivante.
  $effect(() => {
    if (open) {
      reason = '';
      error = null;
    }
  });

  const description = $derived(
    item
      ? `${nomAdherent(item)} — ${item.product?.name ?? 'article'} ×${item.order.quantity}. L'adhérent en sera prévenu sur son téléphone.`
      : undefined
  );

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!item || isSubmitting) return;
    isSubmitting = true;
    error = await onReject(item.order.id, reason.trim());
    isSubmitting = false;
    // En cas de succès, la page se recharge : la feuille n'a pas à se refermer d'elle-même.
  }
</script>

<FormSheet
  bind:open
  title="Refuser la commande"
  {description}
  icon={X}
  {error}
  {isSubmitting}
  submitLabel="Refuser"
  submittingLabel="Refus…"
  namedActions
  onSubmit={handleSubmit}
>
  <FormField
    id="reject-reason"
    label="Motif du refus (facultatif)"
    keepLabel
    hint="Affiché à l'adhérent dans « Mes commandes » et repris dans la notification."
  >
    <Textarea
      id="reject-reason"
      bind:value={reason}
      rows={3}
      maxlength={REJECTION_REASON_MAX_LENGTH}
      placeholder="Ex. : taille épuisée chez le fournisseur, commande en double…"
    />
  </FormField>
</FormSheet>
