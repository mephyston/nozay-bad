<script lang="ts">
  import { Button, Badge, Amount, DropdownMenu, DataTable, DataTableToolbar, Table, Card } from '@nba/ui';
  import { Check, X, Banknote, MoreHorizontal } from "@lucide/svelte";

  import type { OrderItem } from './orders-manager-types';
  import type { Snippet } from 'svelte';
  import { paymentMethodLabels } from './orders-manager-types';

  /**
   * Table des commandes encore ouvertes, pour les deux étapes du workflow.
   *
   * `created` se joue entre valider et refuser ; `awaiting_payment` entre encaisser
   * et annuler. Les deux tables ne diffèrent que par ce couple d'actions et par la
   * colonne d'ancienneté, d'où un seul composant plutôt que deux presque identiques.
   */
  let {
    orders = [],
    stage,
    processingId = null,
    isClosed = false,
    toolbarFilters,
    toolbarActions,
    searchTerm = $bindable(''),
    onPrimary,
    onSecondary
  }: {
    orders?: OrderItem[];
    stage: 'created' | 'awaiting_payment';
    processingId?: number | null;
    isClosed?: boolean;
    toolbarFilters?: Snippet;
    toolbarActions?: Snippet;
    searchTerm?: string;
    onPrimary: (id: number) => void;
    onSecondary: (id: number) => void;
  } = $props();

  const copy = $derived(
    stage === 'created'
      ? {
          primary: 'Valider',
          secondary: 'Refuser',
          emptyTitle: 'Aucune commande à valider',
          emptyDescription: "Aucune demande d'achat en attente de validation."
        }
      : {
          primary: 'Encaisser',
          secondary: 'Annuler',
          emptyTitle: 'Aucune commande à encaisser',
          emptyDescription: 'Aucune commande validée n\'attend de règlement.'
        }
  );

  const dateFr = (value: string | Date | null | undefined) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
  };

  /** Au-delà d'une semaine, la commande entre dans le périmètre de la relance hebdomadaire. */
  const daysWaiting = (since: string | null) => {
    if (!since) return null;
    const d = new Date(since);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  };
</script>

<DataTable
  data={orders}
  emptyTitle={copy.emptyTitle}
  emptyDescription={copy.emptyDescription}
>

  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une commande..."
      hasFilters={!!toolbarFilters}
      filtersActive={true}
    >
      {#snippet filters()}
        {#if toolbarFilters}
          {@render toolbarFilters()}
        {/if}
      {/snippet}
      {#snippet actions()}
        {#if toolbarActions}
          {@render toolbarActions()}
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <div class="block md:hidden divide-y divide-border">
      {#each orders as item (item.order.id)}
        <Card.Root>
        <Card.Content class="p-4 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              {#if item.member}
                <div class="font-bold text-sm text-foreground">
                  {item.member.lastName} {item.member.firstName}
                </div>
                <div class="text-xs text-muted-foreground font-mono">
                  Licence: {item.member.licence}
                </div>
              {:else}
                <span class="text-xs text-muted-foreground italic">Adhérent inconnu</span>
              {/if}
            </div>
            <div class="text-right">
              <span class="text-[11px] text-muted-foreground block">
                {dateFr(item.order.createdAt)}
              </span>
              <span class="font-bold text-base text-foreground block">
                <Amount cents={(item.order as any).totalAmountCents ?? item.order.totalAmount} />
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <div>
              <span class="text-muted-foreground">Article : </span>
              <span class="font-medium text-foreground">{item.product?.name || 'Produit supprimé'}</span>
              <span class="font-bold text-muted-foreground ml-1">(x{item.order.quantity})</span>
            </div>
            <Badge variant="outline" size="xs">
              {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
            </Badge>
          </div>

          {#if stage === 'awaiting_payment'}
            {@const days = daysWaiting(item.order.awaitingPaymentSince)}
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">
                En attente depuis le {dateFr(item.order.awaitingPaymentSince)}
              </span>
              {#if days !== null && days >= 7}
                <Badge variant="warning" size="xs">
                  Relancée ({days} j)
                </Badge>
              {/if}
            </div>
          {/if}

          <div class="flex items-center gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onclick={() => onPrimary(item.order.id)}
              disabled={processingId !== null || isClosed}
              class="h-9 text-xs font-bold gap-1.5 flex-1 bg-success/10 text-success hover:bg-success/10 border-success/20"
            >
              {#if stage === 'created'}
                <Check class="w-4 h-4" />
              {:else}
                <Banknote class="w-4 h-4" />
              {/if}
              <span>{copy.primary}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() => onSecondary(item.order.id)}
              disabled={processingId !== null || isClosed}
              class="h-9 text-xs font-bold gap-1.5 flex-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30"
            >
              <X class="w-4 h-4" />
              <span>{copy.secondary}</span>
            </Button>
          </div>
        </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/snippet}
          {#snippet header()}
            <Table.Head>Date</Table.Head>
            <Table.Head>Adhérent</Table.Head>
            <Table.Head>Produit</Table.Head>
            <Table.Head class="text-center">Qté</Table.Head>
            {#if stage === 'awaiting_payment'}
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
                  <div class="font-medium text-foreground">
                    {item.member.lastName} {item.member.firstName}
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
              {#if stage === 'awaiting_payment'}
                {@const days = daysWaiting(item.order.awaitingPaymentSince)}
                <Table.Cell class="whitespace-nowrap text-muted-foreground">
                  {dateFr(item.order.awaitingPaymentSince)}
                  {#if days !== null && days >= 7}
                    <Badge variant="warning" size="xs" class="ml-1.5">
                      {days} j
                    </Badge>
                  {/if}
                </Table.Cell>
              {/if}
              <Table.Cell class="whitespace-nowrap">
                <Badge variant="outline">
                  {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
                </Badge>
              </Table.Cell>
              <Table.Cell class="text-right font-bold text-foreground">
                <Amount cents={(item.order as any).totalAmountCents ?? item.order.totalAmount} />
              </Table.Cell>
              <Table.Cell class="text-right relative">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    {#snippet child({ props })}
                      <Button
                        {...props}
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontal class="h-4 w-4" />
                        <span class="sr-only">Toggle menu</span>
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Label>Actions</DropdownMenu.Label>
                    <DropdownMenu.Item
                      onclick={() => onPrimary(item.order.id)}
                      disabled={processingId !== null || isClosed}
                      class="text-success focus:text-success font-semibold cursor-pointer"
                    >
                      {#if stage === 'created'}
                        <Check class="w-3.5 h-3.5 mr-2" />
                      {:else}
                        <Banknote class="w-3.5 h-3.5 mr-2" />
                      {/if}
                      {copy.primary}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onclick={() => onSecondary(item.order.id)}
                      disabled={processingId !== null || isClosed}
                      class="text-destructive focus:text-destructive font-semibold cursor-pointer"
                    >
                      <X class="w-3.5 h-3.5 mr-2" />
                      {copy.secondary}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Table.Cell>
            </Table.Row>
          {/snippet}
</DataTable>
