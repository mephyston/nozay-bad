<script lang="ts">
  import { Check, X, History } from "@lucide/svelte";
  import { Badge, Card, Table } from "@nba/ui";
  import type { OrderItem } from './orders-manager-types';
  import { paymentMethodLabels } from './orders-manager-types';

  let { historyOrders = [] }: { historyOrders: OrderItem[] } = $props();
</script>

<div class="space-y-8">
  {#if historyOrders.length === 0}
    <Card.Root class="p-8 text-center text-muted-foreground">
      <Card.Content class="p-0">
        <History class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        Aucun historique de commande disponible.
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root class="overflow-hidden shadow-sm">
      <Card.Content class="p-0">
        <div class="overflow-x-auto">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Date</Table.Head>
                <Table.Head>Adhérent</Table.Head>
                <Table.Head>Article</Table.Head>
                <Table.Head class="text-center">Quantité</Table.Head>
                <Table.Head>Paiement</Table.Head>
                <Table.Head class="text-right">Total</Table.Head>
                <Table.Head class="text-center">Statut</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each historyOrders as item (item.order.id)}
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
                    {(item.order.totalAmount / 100).toFixed(2)} €
                  </Table.Cell>
                  <Table.Cell class="text-center">
                    {#if item.order.status === 'approved'}
                      <Badge variant="secondary" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1">
                        <Check class="w-3 h-3" />
                        Validée
                      </Badge>
                      {#if item.order.ledgerEntryId}
                        <div class="text-[10px] text-muted-foreground mt-0.5">
                          Tx: #{item.order.ledgerEntryId}
                        </div>
                      {/if}
                    {:else if item.order.status === 'rejected'}
                      <Badge variant="destructive" class="bg-destructive/10 text-destructive hover:bg-destructive/10 font-semibold gap-1">
                        <X class="w-3 h-3" />
                        Refusée
                      </Badge>
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
