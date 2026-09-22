<script lang="ts">
  import { Ban, Check, X } from '@lucide/svelte';
  import { Amount, Badge, DataTable, DataTableRowActions, DropdownMenu, RowActionItems, Table } from '@nba/ui';
  import type { Snippet } from 'svelte';
  import type { OrderItem } from './orders-manager-types';
  import OrdersList from './OrdersList.svelte';
  import { actionsDeCommande, dateFr, montantCents } from './orders-row-model';

  /**
   * Une seule action ici, et sur les seules commandes payées : annuler l'encaissement.
   * Refusées et annulées sont des issues fermées, elles n'ont plus de menu.
   *
   * Sous 768 px, {@link OrdersList} prend le relais : même projection de ligne et même
   * fiche de détail que les commandes ouvertes, seul le jeu d'actions change.
   */
  let {
    historyOrders = [],
    isClosed = false,
    toolbar: barreDOutils,
    onUnpay,
    onOuvrir
  }: {
    historyOrders?: OrderItem[];
    isClosed?: boolean;
    /** La barre d'outils, commune aux deux tables et rendue par l'écran. */
    toolbar?: Snippet;
    onUnpay?: (id: number) => void;
    onOuvrir: (item: OrderItem) => void;
  } = $props();

  /*
    Seule la clôture retire les actions. Une transition en vol ne les fait pas
    disparaître de toutes les lignes le temps d'un aller-retour réseau — la
    ré-entrance est déjà gardée par `runTransition`, qui refuse un second appel.
  */
  const verrouille = $derived(isClosed);
</script>

<DataTable
  data={historyOrders}
  mobileSpacing="list"
  emptyTitle="Aucun historique"
  emptyDescription="Aucun historique de commande disponible."
>
  {#snippet toolbar()}
    {@render barreDOutils?.()}
  {/snippet}

  {#snippet mobileView()}
    <OrdersList
      orders={historyOrders}
      vue="history"
      {verrouille}
      {onUnpay}
      {onOuvrir}
      emptyTitle="Aucun historique"
      emptyDescription="Aucun historique de commande disponible."
    />
  {/snippet}

  {#snippet header()}
    <Table.Head>Date</Table.Head>
    <Table.Head>Adhérent</Table.Head>
    <Table.Head>Article</Table.Head>
    <Table.Head class="text-center">Quantité</Table.Head>
    <Table.Head>Paiement</Table.Head>
    <Table.Head class="text-right">Total</Table.Head>
    <Table.Head class="text-center">Statut</Table.Head>
    <Table.Head class="w-12"><span class="sr-only">Actions</span></Table.Head>
  {/snippet}

  {#snippet row(item)}
    <Table.Row class="hover:bg-muted/50 transition-colors">
      <Table.Cell class="text-muted-foreground whitespace-nowrap">
        {dateFr(item.order.createdAt)}
      </Table.Cell>
      <Table.Cell>
        {#if item.member}
          <div class="font-medium text-foreground">
            {item.member.lastName}
            {item.member.firstName}
          </div>
          <div class="text-xs text-muted-foreground font-mono">
            Licence: {item.member.licence}
          </div>
        {:else}
          <span class="text-xs text-muted-foreground italic">Inconnu</span>
        {/if}
      </Table.Cell>
      <Table.Cell>
        {#if item.product}
          <span class="font-medium text-foreground">{item.product.name}</span>
        {:else}
          <span class="text-xs text-muted-foreground italic">Produit supprimé</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-center font-semibold text-foreground">
        {item.order.quantity}
      </Table.Cell>
      <Table.Cell class="whitespace-nowrap">
        <Badge variant="outline">
          {item.order.paymentMethodLabel || item.order.paymentMethod}
        </Badge>
      </Table.Cell>
      <Table.Cell class="text-right font-bold text-foreground">
        <Amount cents={montantCents(item)} />
      </Table.Cell>
      <Table.Cell class="text-center">
        {#if item.order.status === 'paid'}
          <Badge variant="success">
            <Check class="w-3 h-3" />
            Payée
          </Badge>
          {#if item.order.ledgerEntryId}
            <div class="text-[10px] text-muted-foreground mt-0.5">
              Tx: #{item.order.ledgerEntryId}
            </div>
          {/if}
        {:else if item.order.status === 'rejected'}
          <Badge variant="destructive">
            <X class="w-3 h-3" />
            Refusée
          </Badge>
        {:else if item.order.status === 'cancelled'}
          <Badge variant="outline">
            <Ban class="w-3 h-3" />
            Annulée
          </Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-right relative">
        {@const actions = actionsDeCommande(item, { verrouille, onUnpay })}
        {#if actions.length > 0}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <RowActionItems {actions} {item} />
          </DataTableRowActions>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
