<script lang="ts">
  import { Badge, ResponsiveSheet } from '@nba/ui';
  import OrderDetailActions from './OrderDetailActions.svelte';
  import type { OrderItem } from './orders-manager-types';
  import {
    AUCUN_DROIT,
    ETAPE_LABELS,
    ETAPE_VARIANTS,
    actionPermise,
    dateFr,
    enRetard,
    estOuverte,
    etapeOuverte,
    issueCommande,
    ligneCommande,
    nomAdherent,
    type DroitsCommande
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
   * libellé, et c'est le dernier garde-fou avant de refuser une commande, de défaire
   * un encaissement ou une remise.
   */
  let {
    open = $bindable(false),
    item = null,
    verrouille = false,
    onPrimary,
    onSecondary,
    onUndeliver,
    onEdit,
    droits = AUCUN_DROIT
  }: {
    open?: boolean;
    item?: OrderItem | null;
    /** Saison clôturée, ou transition en cours. */
    verrouille?: boolean;
    onPrimary?: (id: number) => void;
    onSecondary?: (id: number) => void;
    onUndeliver?: (id: number) => void;
    /** Corriger la commande tant qu'elle est ouverte ; absent sans le droit de modifier. */
    onEdit?: (item: OrderItem) => void;
    /** Une action que l'utilisateur n'a pas le droit d'accomplir n'a pas de bouton. */
    droits?: DroitsCommande;
  } = $props();

  const ouverte = $derived(!!item && estOuverte(item));
  const etape = $derived(item && ouverte ? etapeOuverte(item) : null);
  const issue = $derived(item ? issueCommande(item) : null);
  const retard = $derived(item ? enRetard(item) : null);
  const ligne = $derived(item ? ligneCommande(item) : null);

  const primairePermise = $derived(!!etape && actionPermise(etape, 'primaire', droits));
  const secondairePermise = $derived(!!etape && actionPermise(etape, 'secondaire', droits));
  const corrigeable = $derived(!!onEdit && !!etape && etape !== 'paid');

  /** Rien à proposer — issue close sans retour, ou aucun droit sur l'étape : pas de pied du tout. */
  const sansActions = $derived(
    verrouille ||
      (ouverte
        ? !(primairePermise || secondairePermise || corrigeable)
        : !(item?.order.status === 'delivered' && onUndeliver))
  );
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
          <Badge variant={ETAPE_VARIANTS[etape] as 'warning'}>{ETAPE_LABELS[etape]}</Badge>
        {/if}
      </div>

      <div class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {@render rangee('Article', ligne.sousTitre)}
        {#if item.member}
          {@render rangee('Licence', item.member.licence, true)}
          {#if item.member.gender}
            {@render rangee('Sexe', item.member.gender === 'F' ? 'Femme' : 'Homme')}
          {/if}
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
        {#if item.order.status === 'delivered' && item.order.deliveredAt}
          {@render rangee('Livrée le', dateFr(item.order.deliveredAt))}
        {/if}
        {#if item.order.ledgerEntryId}
          {@render rangee('Écriture', `#${item.order.ledgerEntryId}`, true)}
        {/if}
        {@render rangee('Commande', `n° ${item.order.id}`, true)}
      </div>

      {#if item.order.status === 'rejected' && item.order.rejectionReason}
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <div class="text-sm text-muted-foreground">Motif du refus</div>
          <p class="mt-1 whitespace-pre-line text-sm text-foreground">{item.order.rejectionReason}</p>
        </div>
      {/if}

      {#if retard !== null}
        <p class="px-1 text-xs text-muted-foreground">
          Cette commande attend son règlement depuis plus d'une semaine : elle figure dans la relance
          hebdomadaire.
        </p>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    {#if item}
      <OrderDetailActions
        {item}
        {etape}
        {primairePermise}
        {secondairePermise}
        {corrigeable}
        {onPrimary}
        {onSecondary}
        {onUndeliver}
        {onEdit}
        onFermer={() => (open = false)}
      />
    {/if}
  {/snippet}
</ResponsiveSheet>
