<script lang="ts">
  import { Edit, Trash2, ShoppingBag, Search, MoreHorizontal, Plus } from "@lucide/svelte";
  import { Button, Input, Badge, Card, Table, Amount, DropdownMenu } from "@nba/ui";
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

<Card.Root class="overflow-hidden shadow-sm w-full">
  <Card.Header class="bg-card border-b border-border pb-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <Card.Title class="text-base font-semibold flex items-center gap-2">
        <ShoppingBag class="h-4 w-4 text-primary" />
        <span>Articles en vente</span>
      </Card.Title>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
        <div class="relative w-full sm:w-64">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder="Rechercher un article..."
            bind:value={searchTerm}
            class="pl-8 pr-3 w-full h-9 text-xs"
          />
        </div>
        {#if onOpenAdd}
          <Button onclick={onOpenAdd} size="sm" class="font-bold flex items-center justify-center gap-1.5 shrink-0 h-9">
            <Plus class="w-4 h-4" />
            <span>Nouveau produit</span>
          </Button>
        {/if}
      </div>
    </div>
  </Card.Header>
  <Card.Content class="p-0">
    <!-- Vue Cartes pour Mobile -->
    <div class="block sm:hidden divide-y divide-border">
      {#if filteredProducts.length === 0}
        <div class="p-6 text-center text-muted-foreground text-sm">
          Aucun article trouvé.
        </div>
      {:else}
        {#each filteredProducts as product (product.id)}
          <div class="p-4 space-y-3 bg-card">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="font-bold text-sm text-foreground">{product.name}</h4>
                {#if !category || category === 'all'}
                  <div class="mt-1">
                    <Badge variant="secondary" class="bg-primary/10 text-primary font-semibold text-[10px]">
                      {getCategoryLabel(product)}
                    </Badge>
                  </div>
                {/if}
              </div>
              <div class="text-right">
                <span class="font-bold text-base text-foreground block">
                  <Amount cents={(product as any).priceCents ?? product.price} />
                </span>
                <Button
                  variant="ghost"
                  onclick={() => onToggleActive(product)}
                  class="p-0 h-auto text-xs font-semibold mt-0.5 inline-flex items-center gap-1"
                >
                  {#if product.active}
                    <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span class="text-emerald-600 dark:text-emerald-400">Actif</span>
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
          </div>
        {/each}
      {/if}
    </div>

    <!-- Vue Tableau pour Tablette / Desktop -->
    <div class="hidden sm:block overflow-x-auto min-h-[220px]">
      <Table.Root class="w-full text-left border-collapse text-sm">
        <Table.Header>
          <Table.Row>
            <Table.Head>Nom</Table.Head>
            {#if !category || category === 'all'}
              <Table.Head>Catégorie</Table.Head>
            {/if}
            <Table.Head>Prix</Table.Head>
            <Table.Head>Statut</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredProducts.length === 0}
            <Table.Row>
              <Table.Cell colspan={!category || category === 'all' ? 5 : 4} class="text-center text-muted-foreground text-sm">
                Aucun article trouvé.
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredProducts as product (product.id)}
              <Table.Row>
                <Table.Cell class="font-medium">
                  {product.name}
                </Table.Cell>
                {#if !category || category === 'all'}
                  <Table.Cell>
                    <Badge variant="secondary" class="bg-primary/10 text-primary hover:bg-primary/10 font-semibold">
                      {getCategoryLabel(product)}
                    </Badge>
                  </Table.Cell>
                {/if}
                <Table.Cell class="font-bold text-foreground">
                  <Amount cents={(product as any).priceCents ?? product.price} />
                </Table.Cell>
                <Table.Cell>
                  <Button 
                    variant="ghost" 
                    onclick={() => onToggleActive(product)}
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors border border-transparent hover:border-border cursor-pointer bg-transparent h-auto"
                    title="Cliquer pour changer le statut"
                  >
                    {#if product.active}
                      <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span class="text-emerald-600 dark:text-emerald-400">Actif</span>
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
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>
