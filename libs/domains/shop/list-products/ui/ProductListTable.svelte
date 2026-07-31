<script lang="ts">
  import { Edit, Trash2, ShoppingBag, Search, MoreHorizontal, Plus } from "@lucide/svelte";
  import { Button, Input, Badge, Amount, DropdownMenu, DataTable, DataTableToolbar, Table, Card } from"@nba/ui";
  import type { Product } from './products-manager-types';

  let {
    filteredProducts = [],
    category,
    searchTerm = $bindable(''),
    onStartEdit,
    onToggleActive,
    onArchive,
    onOpenAdd
  }: {
    filteredProducts?: Product[];
    category?: number | 'all';
    searchTerm?: string;
    onStartEdit: (p: Product) => void;
    onToggleActive: (p: Product) => void;
    onArchive: (p: Product) => void;
    onOpenAdd?: () => void;
  } = $props();

  function getCategoryLabel(product: Product): string {
    if ((product as any).categoryLabel) return (product as any).categoryLabel;
    const cat = product.category ?? (product as any).productCategoryId;
    if (cat === 'shuttlecock' || cat === 1 || cat === '1' || cat === 'Volants') return 'Volants';
    if (cat === 'string' || cat === 2 || cat === '2' || cat === 'Cordages') return 'Cordages';
    if (cat === 'other' || cat === 3 || cat === '3' || cat === 'Textile & Accessoires' || cat === 'autre') return 'Textile & Accessoires';
    return typeof cat === 'string' && cat ? cat : 'Autre';
  }
</script>

<DataTable
  data={filteredProducts}
  emptyTitle="Aucun article"
  emptyDescription="Aucun article trouvé."
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher un article..."
      hasFilters={false}
    >
      {#snippet actions()}
        {#if onOpenAdd}
          <Button onclick={onOpenAdd} class="font-bold flex items-center justify-center gap-1.5 shrink-0 h-9">
            <Plus class="w-4 h-4" />
            <span>Nouveau produit</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
      {#if filteredProducts.length === 0}
        <div class="p-6 text-center text-muted-foreground text-sm">
          Aucun article trouvé.
        </div>
      {:else}
        {#each filteredProducts as product (product.id)}
          <Card.Root>
          <Card.Content class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="font-bold text-sm text-foreground">{product.name}</h4>
                {#if !category || category === 'all'}
                  <div class="mt-1">
                    <Badge variant="primary-soft" size="xs">
                      {getCategoryLabel(product)}
                    </Badge>
                  </div>
                {/if}
              </div>
              <div class="text-right">
                <span class="font-bold text-base text-foreground block">
                  <Amount cents={(product as any).priceCents ?? product.price} />
                </span>
                {#if product.trackStock}
                  <span class="text-xs {product.stock > 0 ? 'text-muted-foreground' : 'text-destructive font-semibold'} block mt-0.5">
                    Stock: {product.stock}
                  </span>
                {/if}
                <Button
                  variant="ghost"
                  onclick={() => onToggleActive(product)}
                  class="p-0 h-auto text-xs font-semibold mt-0.5 inline-flex items-center gap-1"
                >
                  {#if product.active}
                    <span class="h-2 w-2 rounded-full bg-success/10"></span>
                    <span class="text-success">Actif</span>
                  {:else}
                    <span class="h-2 w-2 rounded-full bg-muted-foreground"></span>
                    <span class="text-muted-foreground">Inactif</span>
                  {/if}
                </Button>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onclick={() => onStartEdit(product)}
                class="h-8 text-xs font-semibold gap-1.5 flex-1"
              >
                <Edit class="w-3.5 h-3.5" />
                <span>Modifier</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onclick={() => onArchive(product)}
                class="h-8 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Désactiver</span>
              </Button>
            </div>
          </Card.Content>
          </Card.Root>
        {/each}
      {/if}
  {/snippet}

  {#snippet header()}
          <Table.Head>Nom</Table.Head>
          {#if !category || category === 'all'}
            <Table.Head>Catégorie</Table.Head>
          {/if}
          <Table.Head>Prix</Table.Head>
          <Table.Head>Stock</Table.Head>
          <Table.Head>Statut</Table.Head>
          <Table.Head class="text-right">Actions</Table.Head>
        {/snippet}

        {#snippet row(product)}
          <Table.Row>
            <Table.Cell class="font-medium">
              {product.name}
            </Table.Cell>
            {#if !category || category === 'all'}
              <Table.Cell>
                <Badge variant="primary-soft">
                  {getCategoryLabel(product)}
                </Badge>
              </Table.Cell>
            {/if}
            <Table.Cell class="font-bold text-foreground">
              <Amount cents={(product as any).priceCents ?? product.price} />
            </Table.Cell>
            <Table.Cell>
              {#if product.trackStock}
                <Badge variant={product.stock > 0 ? "outline" : "destructive"}>
                  {product.stock}
                </Badge>
              {:else}
                <span class="text-muted-foreground text-xs italic">-</span>
              {/if}
            </Table.Cell>
            <Table.Cell>
              <Button 
                variant="ghost" 
                onclick={() => onToggleActive(product)}
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors border border-transparent hover:border-border cursor-pointer bg-transparent h-auto"
                title="Cliquer pour changer le statut"
              >
                {#if product.active}
                  <span class="h-2 w-2 rounded-full bg-success/10"></span>
                  <span class="text-success">Actif</span>
                {:else}
                  <span class="h-2 w-2 rounded-full bg-muted-foreground"></span>
                  <span class="text-muted-foreground">Inactif</span>
                {/if}
              </Button>
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
                    onclick={(e) => { e.stopPropagation(); onStartEdit(product); }}
                    class="cursor-pointer"
                  >
                    <Edit class="w-3.5 h-3.5 mr-2" />
                    Modifier
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={(e) => { e.stopPropagation(); onArchive(product); }}
                    class="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5 mr-2" />
                    Désactiver
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Table.Cell>
          </Table.Row>
        {/snippet}
</DataTable>
