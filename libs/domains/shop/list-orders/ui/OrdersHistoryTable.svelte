<script lang="ts">
  import GenreAdherent from './GenreAdherent.svelte';
  import { Ban, PackageCheck, X } from '@lucide/svelte';
  import { Amount, Badge, DataTable, DataTableRowActions, DropdownMenu, RowActionItems, Table } from '@nba/ui';
  import type { Snippet } from 'svelte';
  import type { OrderItem, OrdersTab } from './orders-manager-types';
  import OrdersList from './OrdersList.svelte';
  import { actionsDeCommande, dateFr, montantCents } from './orders-row-model';

  /**
   * Une seule action ici, et sur les seules commandes livrées : annuler la remise.
   * Refusées et annulées sont des issues fermées, elles n'ont plus de menu. Une
   * commande payée n'est pas encore de l'histoire : elle attend d'être remise, et vit
   * dans les commandes en cours, où se défait aussi son encaissement.
   *
   * Sous 768 px, {@link OrdersList} prend le relais : même projection de ligne et même
   * fiche de détail que les commandes ouvertes, seul le jeu d'actions change.
   */
  let {
    historyOrders = [],
    vue = 'delivered',
    isClosed = false,
    toolbar: barreDOutils,
    onUndeliver,
    onOuvrir
  }: {
    historyOrders?: OrderItem[];
    /** `delivered` ou `closed` : la vue d'issues que la table montre. */
    vue?: OrdersTab;
    isClosed?: boolean;
    /** La barre d'outils, commune aux deux tables et rendue par l'écran. */
    toolbar?: Snippet;
    onUndeliver?: (id: number) => void;
    onOuvrir: (item: OrderItem) => void;
  } = $props();

  /*
    Seule la clôture retire les actions. Une transition en vol ne les fait pas
    disparaître de toutes les lignes le temps d'un aller-retour réseau — la
    ré-entrance est déjà gardée par `runTransition`, qui refuse un second appel.
  */
  const verrouille = $derived(isClosed);

  const copy = $derived(
    vue === 'closed'
      ? { emptyTitle: 'Aucune commande refusée ou annulée', emptyDescription: 'Aucune demande refusée ni commande annulée sur la saison.' }
      : { emptyTitle: 'Aucune commande livrée', emptyDescription: "Aucun article n'a encore été remis sur la saison." }
  );
</script>

<DataTable
  data={historyOrders}
  mobileSpacing="list"
  emptyTitle={copy.emptyTitle}
  emptyDescription={copy.emptyDescription}
>
  {#snippet toolbar()}
    {@render barreDOutils?.()}
  {/snippet}

  {#snippet mobileView()}
    <OrdersList
      orders={historyOrders}
      {vue}
      {verrouille}
      {onUndeliver}
      {onOuvrir}
      emptyTitle={copy.emptyTitle}
      emptyDescription={copy.emptyDescription}
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
          <div class="flex items-center gap-1.5 font-medium text-foreground">
            <span>{item.member.lastName} {item.member.firstName}</span>
            <GenreAdherent gender={item.member.gender} />
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
        {#if item.order.status === 'delivered'}
          <Badge variant="success">
            <PackageCheck class="w-3 h-3" />
            Livrée
          </Badge>
          {#if item.order.deliveredAt}
            <div class="text-[10px] text-muted-foreground mt-0.5">
              le {dateFr(item.order.deliveredAt)}
            </div>
          {/if}
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
          {#if item.order.rejectionReason}
            <div
              class="mx-auto mt-0.5 max-w-48 truncate text-[10px] text-muted-foreground"
              title={item.order.rejectionReason}
            >
              {item.order.rejectionReason}
            </div>
          {/if}
        {:else if item.order.status === 'cancelled'}
          <Badge variant="outline">
            <Ban class="w-3 h-3" />
            Annulée
          </Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-right relative">
        {@const actions = actionsDeCommande(item, { verrouille, onUndeliver })}
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
