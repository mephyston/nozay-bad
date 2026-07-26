<script lang="ts">
  import { Check, X, Clock, MoreHorizontal } from "@lucide/svelte";
  import { Button, Badge, Card, Table, Amount, DropdownMenu } from "@nba/ui";
  import type { OrderItem } from './orders-manager-types';
  import { paymentMethodLabels } from './orders-manager-types';

  let {
    pendingOrders = [],
    processingId = null,
    isClosed = false,
    onApprove,
    onReject
  }: {
    pendingOrders?: OrderItem[];
    processingId?: number | null;
    isClosed?: boolean;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
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
      <!-- Vue Cartes pour Mobile -->
      <div class="block sm:hidden divide-y divide-border">
        {#each pendingOrders as item (item.order.id)}
          <div class="p-4 space-y-3 bg-card">
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
                  {new Date(item.order.createdAt).toLocaleDateString('fr-FR')}
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
              <Badge variant="outline" class="text-[10px]">
                {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
              </Badge>
            </div>

            <div class="flex items-center gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onclick={() => onApprove(item.order.id)}
                disabled={processingId !== null || isClosed}
                class="h-9 text-xs font-bold gap-1.5 flex-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
              >
                <Check class="w-4 h-4" />
                <span>Valider</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onclick={() => onReject(item.order.id)}
                disabled={processingId !== null || isClosed}
                class="h-9 text-xs font-bold gap-1.5 flex-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30"
              >
                <X class="w-4 h-4" />
                <span>Refuser</span>
              </Button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Vue Tableau pour Tablette / Desktop -->
      <div class="hidden sm:block overflow-x-auto">
        <Table.Root class="w-full text-left border-collapse text-sm">
        <Table.Header>
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
              <Table.Row>
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
                        onclick={() => onApprove(item.order.id)}
                        disabled={processingId !== null || isClosed}
                        class="text-emerald-600 focus:text-emerald-600 font-semibold cursor-pointer"
                      >
                        <Check class="w-3.5 h-3.5 mr-2" />
                        Valider
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onclick={() => onReject(item.order.id)}
                        disabled={processingId !== null || isClosed}
                        class="text-destructive focus:text-destructive font-semibold cursor-pointer"
                      >
                        <X class="w-3.5 h-3.5 mr-2" />
                        Refuser
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
