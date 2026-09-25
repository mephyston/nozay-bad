<script lang="ts">
  import { Banknote, Check, Pencil, Undo2, X } from '@lucide/svelte';
  import { Badge, Button, ResponsiveSheet } from '@nba/ui';
  import type { OrderItem } from './orders-manager-types';
  import {
    ACTION_LABELS,
    ETAPE_LABELS,
    dateFr,
    enRetard,
    estOuverte,
    etapeOuverte,
    issueCommande,
    ligneCommande,
    nomAdherent
  } from './orders-row-model';

  /**
   * La fiche d'une commande.
   *
   * Sur téléphone, une ligne ne porte que l'identité, l'article et le montant : les
   * six autres colonnes du tableau doivent bien vivre quelque part, et une commande
   * n'a pas d'écran à elle — elle n'existe que dans cette liste. D'où cette feuille,
   * qui est la fiche de détail que la doctrine suppose.
   *
   * Elle sert aussi de second chemin vers les décisions. Le balayage les offre déjà,
   * mais il ne les **nomme** pas avant de les exécuter : ici les boutons portent leur
   * libellé, et c'est le dernier garde-fou avant de refuser une commande ou de défaire
   * un encaissement.
   */
  let {
    open = $bindable(false),
    item = null,
    verrouille = false,
    onPrimary,
    onSecondary,
    onUnpay,
    onEdit
  }: {
    open?: boolean;
    item?: OrderItem | null;
    /** Saison clôturée, ou transition en cours. */
    verrouille?: boolean;
    onPrimary?: (id: number) => void;
    onSecondary?: (id: number) => void;
    onUnpay?: (id: number) => void;
    /** Corriger la commande tant qu'elle est ouverte ; absent sans le droit de modifier. */
    onEdit?: (item: OrderItem) => void;
  } = $props();

  const ouverte = $derived(!!item && estOuverte(item));
  const etape = $derived(item && ouverte ? etapeOuverte(item) : null);
  const issue = $derived(item ? issueCommande(item) : null);
  const retard = $derived(item ? enRetard(item) : null);
  const ligne = $derived(item ? ligneCommande(item) : null);

  /** Une issue close sans retour possible n'a rien à proposer : pas de pied du tout. */
  const sansActions = $derived(verrouille || (!ouverte && !(item?.order.status === 'paid' && onUnpay)));

  function lancer(action?: (id: number) => void) {
    if (!item || !action) return;
    open = false;
    action(item.order.id);
  }
</script>

{#snippet rangee(label: string, valeur: string, selectable = false)}
  <div class="flex items-baseline justify-between gap-4 px-4 py-2.5">
    <span class="shrink-0 text-sm text-muted-foreground">{label}</span>
    <!--
      `data-selectable` : une licence et une référence d'écriture se recopient. Les
      gestes qui suppriment la sélection de texte doivent y renoncer.
    -->
    <span class="min-w-0 text-right text-sm text-foreground" data-selectable={selectable ? '' : undefined}>
      {valeur}
    </span>
  </div>
{/snippet}

<ResponsiveSheet
  bind:open
  title={item ? nomAdherent(item) : 'Commande'}
  detents={[0.55, 0.92]}
  size="sm"
  footerHidden={sansActions}
>
  {#if item && ligne}
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3 px-1">
        <span class="text-2xl font-semibold tabular-nums text-foreground">{ligne.valeur}</span>
        {#if issue}
          <Badge variant={issue.variant as 'success'}>{issue.label}</Badge>
        {:else if etape}
          <Badge variant={etape === 'created' ? 'warning' : 'secondary'}>{ETAPE_LABELS[etape]}</Badge>
        {/if}
      </div>

      <div class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {@render rangee('Article', ligne.sousTitre)}
        {#if item.member}
          {@render rangee('Licence', item.member.licence, true)}
        {/if}
        {@render rangee('Règlement', item.order.paymentMethodLabel || item.order.paymentMethod)}
        {@render rangee('Créée le', dateFr(item.order.createdAt))}
        {#if item.order.status === 'awaiting_payment'}
          {@render rangee(
            'En attente depuis',
            retard !== null
              ? `${dateFr(item.order.awaitingPaymentSince)} (${retard} j)`
              : dateFr(item.order.awaitingPaymentSince)
          )}
        {/if}
        {#if item.order.ledgerEntryId}
          {@render rangee('Écriture', `#${item.order.ledgerEntryId}`, true)}
        {/if}
        {@render rangee('Commande', `n° ${item.order.id}`, true)}
      </div>

      {#if retard !== null}
        <p class="px-1 text-xs text-muted-foreground">
          Cette commande attend son règlement depuis plus d'une semaine : elle figure dans la relance
          hebdomadaire.
        </p>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {#if ouverte && etape}
        {#if onEdit}
          <Button
            type="button"
            variant="outline"
            onclick={() => {
              if (!item) return;
              const courant = item;
              open = false;
              onEdit(courant);
            }}
            class="w-full sm:mr-auto sm:w-auto"
          >
            <Pencil class="size-4" />
            Modifier
          </Button>
        {/if}
        <Button
          type="button"
          variant="outline"
          onclick={() => lancer(onSecondary)}
          class="w-full text-destructive sm:w-auto"
        >
          <X class="size-4" />
          {ACTION_LABELS[etape].secondaire}
        </Button>
        <Button type="button" onclick={() => lancer(onPrimary)} class="w-full sm:w-auto">
          {#if etape === 'created'}
            <Check class="size-4" />
          {:else}
            <Banknote class="size-4" />
          {/if}
          {ACTION_LABELS[etape].primaire}
        </Button>
      {:else if item?.order.status === 'paid' && onUnpay}
        <Button
          type="button"
          variant="outline"
          onclick={() => lancer(onUnpay)}
          class="w-full text-destructive sm:w-auto"
        >
          <Undo2 class="size-4" />
          Annuler l'encaissement
        </Button>
      {/if}
    </div>
  {/snippet}
</ResponsiveSheet>
