<script lang="ts">
  import { SearchableCombobox, Badge, Amount, DataTable, DataTableToolbar, Table, FormField, Card } from '@nba/ui';
  import { Check, X, History } from "@lucide/svelte";
  
  import type { OrderItem, Season } from './orders-manager-types';
  import type { Snippet } from 'svelte';
  import { paymentMethodLabels } from './orders-manager-types';

  let { 
    historyOrders = [],
    toolbarFilters,
    toolbarActions,
    searchTerm = $bindable('')
  }: { 
    historyOrders?: OrderItem[];
    toolbarFilters?: Snippet;
    toolbarActions?: Snippet;
    searchTerm?: string;
  } = $props();
</script>

<DataTable
  data={historyOrders}
  emptyTitle="Aucun historique"
  emptyDescription="Aucun historique de commande disponible."
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
            {#snippet header()}
              <Table.Head>Date</Table.Head>
              <Table.Head>Adhérent</Table.Head>
              <Table.Head>Article</Table.Head>
              <Table.Head class="text-center">Quantité</Table.Head>
              <Table.Head>Paiement</Table.Head>
              <Table.Head class="text-right">Total</Table.Head>
              <Table.Head class="text-center">Statut</Table.Head>
            {/snippet}

            {#snippet row(item)}
              <Table.Row class="hover:bg-muted/50 transition-colors">
                <Table.Cell class="text-muted-foreground whitespace-nowrap">
                  {new Date(item.order.createdAt).toLocaleDateString('fr-FR')}
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
                    {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-right font-bold text-foreground">
                  <Amount cents={(item.order as any).totalAmountCents ?? item.order.totalAmount} />
                </Table.Cell>
                <Table.Cell class="text-center">
                  {#if item.order.status === 'approved'}
                    <Badge variant="success">
                      <Check class="w-3 h-3" />
                      Validée
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
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/snippet}
  {#snippet mobileView()}
    <div class="md:hidden flex flex-col gap-4">
      {#each historyOrders as item (item.order.id)}
        <Card.Root class="relative">
        <Card.Content class="p-4 flex flex-col gap-3">
          <div class="flex justify-between items-start gap-4">
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">{new Date(item.order.createdAt).toLocaleDateString('fr-FR')}</span>
              {#if item.member}
                <span class="font-bold text-base text-foreground leading-tight mt-1">{item.member.lastName} {item.member.firstName}</span>
                <span class="text-[10px] text-muted-foreground font-mono mt-0.5">Licence: {item.member.licence}</span>
              {:else}
                <span class="font-bold text-base text-muted-foreground italic leading-tight mt-1">Inconnu</span>
              {/if}
            </div>
            <div class="flex flex-col items-end shrink-0">
              <Amount cents={(item.order as any).totalAmountCents ?? item.order.totalAmount} class="font-bold text-lg text-foreground" />
              <Badge variant="outline" size="xs" class="mt-1">
                {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
              </Badge>
            </div>
          </div>
          
          <div class="pt-3 border-t border-border flex justify-between items-end gap-4 mt-1">
            <div class="flex flex-col flex-1">
              <span class="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Article</span>
              {#if item.product}
                <span class="font-medium text-sm text-foreground leading-tight">{item.order.quantity} × {item.product.name}</span>
              {:else}
                <span class="font-medium text-sm text-muted-foreground italic leading-tight">Produit supprimé</span>
              {/if}
            </div>
            <div class="flex flex-col items-end shrink-0">
              {#if item.order.status === 'approved'}
                <Badge variant="success" size="sm">
                  <Check class="w-3 h-3" />
                  Validée
                </Badge>
                {#if item.order.ledgerEntryId}
                  <div class="text-[10px] text-muted-foreground mt-1">
                    Tx: #{item.order.ledgerEntryId}
                  </div>
                {/if}
              {:else if item.order.status === 'rejected'}
                <Badge variant="destructive" size="sm">
                  <X class="w-3 h-3" />
                  Refusée
                </Badge>
              {/if}
            </div>
          </div>
        </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/snippet}
</DataTable>
