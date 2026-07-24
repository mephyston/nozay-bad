<script lang="ts">
  import { Check, X, Clock, MoreVertical } from "@lucide/svelte";
  import { Button, Badge, Card, Table } from "@nba/ui";
  import type { OrderItem } from './orders-manager-types';
  import { paymentMethodLabels } from './orders-manager-types';

  let {
    pendingOrders = [],
    processingId,
    isClosed,
    openDropdownId = $bindable(null),
    onApprove,
    onReject,
    onToggleDropdown
  }: {
    pendingOrders: OrderItem[];
    processingId: number | null;
    isClosed: boolean;
    openDropdownId: number | null;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    onToggleDropdown: (id: number, e: MouseEvent) => void;
  } = $props();
</script>

<div class="space-y-8">
  {#if pendingOrders.length === 0}
    <Card.Root class="p-8 text-center text-muted-foreground">
      <Card.Content class="p-0">
        <Clock class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        Aucune commande en attente.
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root class="overflow-hidden shadow-sm">
      <Card.Content class="p-0">
        <div class="overflow-x-auto min-h-[180px]">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Date</Table.Head>
                <Table.Head>Adhérent</Table.Head>
                <Table.Head>Article</Table.Head>
                <Table.Head class="text-center">Quantité</Table.Head>
                <Table.Head>Paiement</Table.Head>
                <Table.Head class="text-right">Total</Table.Head>
                <Table.Head class="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each pendingOrders as item (item.order.id)}
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
                      <div class="font-medium text-foreground">{item.product.name}</div>
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
                  <Table.Cell class="text-right relative">
                    <div class="inline-block text-left">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onclick={(e) => onToggleDropdown(item.order.id, e)} 
                        class="text-muted-foreground hover:text-foreground h-8 w-8 cursor-pointer" 
                        aria-label="Actions"
                      >
                        <MoreVertical class="w-4 h-4" />
                      </Button>

                      {#if openDropdownId === item.order.id}
                        <div class="absolute right-4 mt-1 w-36 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border font-medium">
                          <Button
                            variant="ghost"
                            onclick={() => onApprove(item.order.id)}
                            disabled={processingId !== null || isClosed}
                            class="w-full px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 font-semibold flex items-center gap-1.5 cursor-pointer rounded-none justify-start h-auto bg-transparent border-0"
                          >
                            <Check class="w-3.5 h-3.5" />
                            Valider
                          </Button>
                          <Button
                            variant="ghost"
                            onclick={() => onReject(item.order.id)}
                            disabled={processingId !== null || isClosed}
                            class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer rounded-none justify-start h-auto bg-transparent border-0"
                          >
                            <X class="w-3.5 h-3.5" />
                            Refuser
                          </Button>
                        </div>
                      {/if}
                    </div>
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
