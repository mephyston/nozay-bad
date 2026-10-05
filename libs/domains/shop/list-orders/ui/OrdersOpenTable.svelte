<script lang="ts">
  import GenreAdherent from './GenreAdherent.svelte';
  import { Amount, Badge, DataTable, DataTableRowActions, DropdownMenu, RowActionItems, Table } from '@nba/ui';
  import type { Snippet } from 'svelte';
  import type { OrderItem, OrdersTab } from './orders-manager-types';
  import type { DroitsCommande } from './orders-row-model';
  import OrdersList from './OrdersList.svelte';
  import {
    ETAPE_LABELS,
    ETAPE_VARIANTS,
    actionsDeCommande,
    dateFr,
    etapeOuverte,
    joursDAttente,
    montantCents,
    SEUIL_RELANCE
  } from './orders-row-model';

  /**
   * Table des commandes encore ouvertes, pour les trois étapes du workflow.
   *
   * `created` se joue entre valider et refuser ; `awaiting_payment` entre encaisser
   * et annuler ; `paid` entre livrer et défaire l'encaissement. Les tables ne
   * diffèrent que par ce couple d'actions et par la colonne d'ancienneté, d'où un
   * seul composant plutôt que trois presque identiques.
   *
   * La vue `open` les réunit : c'est celle qu'on ouvre, et qui montre d'un coup ce
   * qui attend une décision, un règlement ou une remise. Chaque ligne y garde les
   * actions de sa propre étape, et une colonne dit laquelle.
   *
   * Sous 768 px, ce n'est plus une table : {@link OrdersList} prend le relais, avec
   * des sections, un balayage et une fiche de détail.
   */
  let {
    orders = [],
    stage,
    isClosed = false,
    toolbar: barreDOutils,
    onPrimary,
    onSecondary,
    onOuvrir,
    onEdit,
    droits
  }: {
    orders?: OrderItem[];
    stage: OrdersTab;
    isClosed?: boolean;
    /** La barre d'outils, commune aux deux tables et rendue par l'écran. */
    toolbar?: Snippet;
    onPrimary: (id: number) => void;
    onSecondary: (id: number) => void;
    onOuvrir: (item: OrderItem) => void;
    /** Absent : pas de droit de modifier, l'action n'est pas offerte. */
    onEdit?: (item: OrderItem) => void;
    /** Ce que l'utilisateur peut décider ou encaisser ; une action interdite n'est pas offerte. */
    droits?: DroitsCommande;
  } = $props();

  /*
    Seule la clôture retire les actions. Une transition en vol ne les fait pas
    disparaître de toutes les lignes le temps d'un aller-retour réseau — la
    ré-entrance est déjà gardée par `runTransition`, qui refuse un second appel.
  */
  const verrouille = $derived(isClosed);

  const copy = $derived(
    stage === 'created'
      ? {
          emptyTitle: 'Aucune commande à valider',
          emptyDescription: "Aucune demande d'achat en attente de validation."
        }
      : stage === 'awaiting_payment'
        ? {
            emptyTitle: 'Aucune commande à encaisser',
            emptyDescription: "Aucune commande validée n'attend de règlement."
          }
        : stage === 'paid'
          ? {
              emptyTitle: 'Aucune commande à livrer',
              emptyDescription: "Toutes les commandes payées ont été remises."
            }
          : {
              emptyTitle: 'Aucune commande en cours',
              emptyDescription: "Aucune demande d'achat à valider, aucune commande à encaisser ni à livrer."
            }
  );
</script>

<DataTable
  data={orders}
  mobileSpacing="list"
  emptyTitle={copy.emptyTitle}
  emptyDescription={copy.emptyDescription}
>
  {#snippet toolbar()}
    {@render barreDOutils?.()}
  {/snippet}

  {#snippet mobileView()}
    <OrdersList
      {orders}
      vue={stage}
      {verrouille}
      {onPrimary}
      {onSecondary}
      {onOuvrir}
      {droits}
      emptyTitle={copy.emptyTitle}
      emptyDescription={copy.emptyDescription}
    />
  {/snippet}

  {#snippet header()}
    <Table.Head>Date</Table.Head>
    <Table.Head>Adhérent</Table.Head>
    <Table.Head>Produit</Table.Head>
    <Table.Head class="text-center">Qté</Table.Head>
    {#if stage === 'open'}
      <Table.Head>Statut</Table.Head>
    {/if}
    {#if stage === 'open' || stage === 'awaiting_payment'}
      <Table.Head>En attente depuis</Table.Head>
    {/if}
    <Table.Head>Règlement</Table.Head>
    <Table.Head class="text-right">Montant</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(item)}
    <Table.Row>
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
          <div class="font-medium text-foreground">{item.product.name}</div>
        {:else}
          <span class="text-xs text-muted-foreground italic">Produit supprimé</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-center font-semibold text-foreground">
        {item.order.quantity}
      </Table.Cell>
      {#if stage === 'open'}
        <Table.Cell class="whitespace-nowrap">
          <Badge variant={ETAPE_VARIANTS[etapeOuverte(item)] as 'warning'}>
            {ETAPE_LABELS[etapeOuverte(item)]}
          </Badge>
        </Table.Cell>
      {/if}
      {#if stage === 'open' || stage === 'awaiting_payment'}
        {@const days = joursDAttente(item.order.awaitingPaymentSince)}
        <Table.Cell class="whitespace-nowrap text-muted-foreground">
          {etapeOuverte(item) === 'awaiting_payment' ? dateFr(item.order.awaitingPaymentSince) : '—'}
          {#if days !== null && days >= SEUIL_RELANCE}
            <Badge variant="warning" size="xs" class="ml-1.5">{days} j</Badge>
          {/if}
        </Table.Cell>
      {/if}
      <Table.Cell class="whitespace-nowrap">
        <Badge variant="outline">
          {item.order.paymentMethodLabel || item.order.paymentMethod}
        </Badge>
      </Table.Cell>
      <Table.Cell class="text-right font-bold text-foreground">
        <Amount cents={montantCents(item)} />
      </Table.Cell>
      <Table.Cell class="text-right relative">
        {@const actions = actionsDeCommande(item, { verrouille, onPrimary, onSecondary, onEdit, droits })}
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
