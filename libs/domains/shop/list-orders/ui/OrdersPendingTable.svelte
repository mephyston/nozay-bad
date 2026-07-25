<script lang="ts">
  import { Check, X, Clock, MoreVertical } from "@lucide/svelte";
  import { Button, Badge, Card, Table, Amount } from "@nba/ui";
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
    onToggleDropdown: (id: number, event: MouseEvent) => void;
  } = $props();
</script>

<Card.Root class="overflow-hidden shadow-sm">
  <Card.Header class="bg-card border-b border-border pb-4">
    <Card.Title class="text-base font-semibold flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Clock class="h-4 w-4 text-amber-500" />
        <span>Commandes en attente de validation</span>
      </div>
      <Badge variant="secondary" class="bg-amber-500/10 text-amber-500 font-semibold border-transparent">
        {pendingOrders.length}
      </Badge>
    </Card.Title>
  </Card.Header>
  <Card.Content class="p-0">
    {#if pendingOrders.length === 0}
      <div class="p-8 text-center text-muted-foreground text-sm">
        Aucune commande en attente de validation.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <Table.Root class="w-full text-left border-collapse text-sm">
          <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
            <Table.Row>
              <Table.Head>Date</Table.Head>
              <Table.Head>Adhérent</Table.Head>
              <Table.Head>Produit</Table.Head>
              <Table.Head class="text-center">Qté</Table.Head>
              <Table.Head>Règlement</Table.Head>
              <Table.Head class="text-right">Montant</Table.Head>
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
                  <Amount cents={(item.order as any).totalAmountCents ?? item.order.totalAmount} />
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
