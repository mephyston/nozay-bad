<script lang="ts">
  import { Select } from '@nba/ui';
  import { Check, X, Clock, MoreHorizontal } from "@lucide/svelte";
  import { Button, Badge, Amount, DropdownMenu, DataTable, DataTableToolbar, Table, FormField, Card } from"@nba/ui";
  import type { OrderItem, Season } from './orders-manager-types';
  import type { Snippet } from 'svelte';
  import { paymentMethodLabels } from './orders-manager-types';

  let {
    pendingOrders = [],
    processingId = null,
    isClosed = false,
    seasonId,
    seasons = [],
    tabsNav,
    searchTerm = $bindable(''),
    onApprove,
    onReject
  }: {
    pendingOrders?: OrderItem[];
    processingId?: number | null;
    isClosed?: boolean;
    seasonId?: string;
    seasons?: Season[];
    tabsNav?: Snippet;
    searchTerm?: string;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
  } = $props();
</script>

<DataTable
  data={pendingOrders}
  emptyTitle="Aucune commande en attente"
  emptyDescription="Aucune commande en attente de validation."
>
  {#snippet toolbarStart()}
    {#if tabsNav}
      {@render tabsNav()}
    {/if}
  {/snippet}

  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une commande..."
      hasFilters={true}
      filtersActive={!!seasonId && seasons.length > 0}
    >
      {#snippet filters()}
          <FormField id="filter-season" label="Saison">
          <Select
            id="filter-season"
            value={seasonId}
            onchange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              const params = new URLSearchParams(window.location.search);
              params.set('season', val);
              window.location.href = `/admin/shop/orders?${params.toString()}`;
            }}
          >
            {#each seasons as season}
              <option value={season.id}>{season.name}</option>
            {/each}
            {#if seasons.length === 0}
              <option value="25-26">Saison 2025-2026</option>
            {/if}
          </Select>
        </FormField>
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <div class="block md:hidden divide-y divide-border">
      {#each pendingOrders as item (item.order.id)}
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
            <Badge variant="outline" size="xs">
              {paymentMethodLabels[item.order.paymentMethod] || item.order.paymentMethod}
            </Badge>
          </div>

          <div class="flex items-center gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onclick={() => onApprove(item.order.id)}
              disabled={processingId !== null || isClosed}
              class="h-9 text-xs font-bold gap-1.5 flex-1 bg-success/10 text-success hover:bg-success/10 border-success/20"
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
            <Table.Head>Règlement</Table.Head>
            <Table.Head class="text-right">Montant</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          {/snippet}

          {#snippet row(item)}
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
                      class="text-success focus:text-success font-semibold cursor-pointer"
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
          {/snippet}
</DataTable>
