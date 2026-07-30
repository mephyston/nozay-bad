<script lang="ts">
  import { Check, X, History } from "@lucide/svelte";
  import { Badge, Amount, DataTable, DataTableToolbar, Table } from "@nba/ui";
  import type { OrderItem, Season } from './orders-manager-types';
  import type { Snippet } from 'svelte';
  import { paymentMethodLabels } from './orders-manager-types';

  let { 
    historyOrders = [],
    seasonId,
    seasons = [],
    tabsNav,
    searchTerm = $bindable('')
  }: { 
    historyOrders?: OrderItem[];
    seasonId?: string;
    seasons?: Season[];
    tabsNav?: Snippet;
    searchTerm?: string;
  } = $props();
</script>

<DataTable
  data={historyOrders}
  emptyTitle="Aucun historique"
  emptyDescription="Aucun historique de commande disponible."
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
        <div class="space-y-1.5">
          <label for="filter-season-history" class="text-xs font-semibold text-muted-foreground">Saison</label>
          <select
            id="filter-season-history"
            class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
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
          </select>
        </div>
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
            {/snippet}
  {#snippet mobileView()}
    <div class="md:hidden flex flex-col gap-4">
      {#each historyOrders as item (item.order.id)}
        <div class="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 relative shadow-sm">
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
              <Badge variant="outline" class="mt-1 font-normal text-[10px] py-0 px-1.5 h-4">
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
                <Badge variant="secondary" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1 text-[11px] py-0.5 px-2">
                  <Check class="w-3 h-3" />
                  Validée
                </Badge>
                {#if item.order.ledgerEntryId}
                  <div class="text-[10px] text-muted-foreground mt-1">
                    Tx: #{item.order.ledgerEntryId}
                  </div>
                {/if}
              {:else if item.order.status === 'rejected'}
                <Badge variant="destructive" class="bg-destructive/10 text-destructive hover:bg-destructive/10 font-semibold gap-1 text-[11px] py-0.5 px-2">
                  <X class="w-3 h-3" />
                  Refusée
                </Badge>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/snippet}
</DataTable>
