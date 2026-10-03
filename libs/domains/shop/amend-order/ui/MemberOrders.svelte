<script lang="ts">
  import { onMount } from 'svelte';
  import { Pencil, X } from '@lucide/svelte';
  import { Button, GlobalConfirm, Toaster, consumeFlash, flashAndReload, uiAlert, uiConfirm } from '@nba/ui';
  import type { Member, PaymentMethodOption, Product } from '../../list-products/ui/catalog-types';
  import { groupFamilies, formatEuros, type ProductFamily } from '../../list-products/ui/catalog-families';
  import ShopOrderDialog from '../../list-products/ui/ShopOrderDialog.svelte';
  import {
    annulerCommande,
    estModifiable,
    familleDeCommande,
    modifierCommande,
    type MemberOrderRow
  } from './member-orders-actions';

  /**
   * « Mes commandes » : la liste, et ce que l'adhérent peut encore y faire.
   *
   * Tant que le bureau n'a pas validé une commande, rien n'est engagé — ni stock, ni
   * montant annoncé. L'adhérent la corrige donc lui-même (une autre taille, une autre
   * quantité, un autre paiement) ou la retire, sans écrire au bureau. Une fois validée,
   * les deux boutons disparaissent : la réservation est faite, c'est au bureau d'agir.
   *
   * La modification rouvre la feuille de commande de la boutique, sur la commande.
   */
  let {
    orders = [],
    products = [],
    member = null,
    paymentMethods = [],
    mediaOrigin = '',
    activeSeasonId = ''
  }: {
    orders: MemberOrderRow[];
    /** Le catalogue actif, pour rouvrir la carte de l'article commandé. */
    products?: Product[];
    member?: Member | null;
    paymentMethods?: PaymentMethodOption[];
    mediaOrigin?: string;
    activeSeasonId?: string;
  } = $props();

  const families = $derived(groupFamilies(products));

  let enCours = $state<MemberOrderRow | null>(null);
  let famille = $state<ProductFamily | null>(null);
  let occupe = $state(false);

  onMount(() => consumeFlash());

  function imageUrl(key: string | null | undefined): string | null {
    return key ? `${mediaOrigin}/media/${key.replace(/^media\//, '')}` : null;
  }

  function modifier(row: MemberOrderRow) {
    enCours = row;
    famille = familleDeCommande(families, row.productId);
  }

  async function annuler(row: MemberOrderRow) {
    if (occupe) return;
    const ok = await uiConfirm({
      title: 'Annuler la commande ?',
      description: `${row.productName} × ${row.quantity} — ${formatEuros(row.totalCents)}. La commande sera retirée ; vous pourrez en repasser une depuis la boutique.`,
      confirmLabel: 'Annuler la commande',
      cancelLabel: 'Garder',
      destructive: true
    });
    if (!ok) return;
    occupe = true;
    const res = await annulerCommande(row);
    occupe = false;
    if (res.success) flashAndReload('Commande annulée.');
    else await uiAlert(res.error ?? "L'annulation de la commande a échoué.");
  }

  const dateFr = (v: string | null) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR') : '';
  };
</script>

{#if orders.length === 0}
  <p class="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
    Aucune commande pour le moment.
  </p>
{:else}
  <div class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" data-testid="member-orders">
    {#each orders as row (row.id)}
      <div class="px-4 py-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-medium text-foreground">
              {row.productName} <span class="text-muted-foreground">×{row.quantity}</span>
            </div>
            <div class="text-xs text-muted-foreground">{dateFr(row.createdAt)}</div>
            {#if row.status === 'rejected' && row.rejectionReason}
              <p class="mt-1 whitespace-pre-line text-xs text-destructive">Motif du refus : {row.rejectionReason}</p>
            {/if}
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <span class="text-sm font-semibold text-foreground">{formatEuros(row.totalCents)}</span>
            <span class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium {row.statutClasse}">
              {row.statutLabel}
            </span>
          </div>
        </div>

        {#if estModifiable(row)}
          <!--
            Deux boutons nommés, à la hauteur des champs (44 points au doigt) : une commande se modifie ou s'annule au
            doigt, et l'annulation demande confirmation. « Modifier » n'est offert que si
            l'article est encore au catalogue — sinon il n'y a plus rien à rechoisir.
          -->
          <div class="mt-2 flex justify-end gap-2">
            {#if familleDeCommande(families, row.productId)}
              <Button type="button" variant="outline" disabled={occupe} onclick={() => modifier(row)}>
                <Pencil class="size-4" />
                Modifier
              </Button>
            {/if}
            <Button
              type="button"
              variant="outline"
              class="text-destructive"
              disabled={occupe}
              onclick={() => annuler(row)}
            >
              <X class="size-4" />
              Annuler
            </Button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

{#if enCours}
  <ShopOrderDialog
    bind:family={famille}
    {member}
    members={member ? [member] : []}
    memberId={String(enCours.memberId)}
    onClosed={() => (enCours = null)}
    {activeSeasonId}
    {paymentMethods}
    {imageUrl}
    editing={{ productId: enCours.productId, quantity: enCours.quantity, paymentMethod: enCours.paymentMethod }}
    submit={modifierCommande(enCours)}
    onOrdered={() => flashAndReload('Commande modifiée.')}
  />
{/if}

<GlobalConfirm />
<Toaster position="top-center" richColors />
