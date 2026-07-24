<script lang="ts">
  import { Edit, Trash2, ShoppingBag, Search, MoreVertical } from "@lucide/svelte";
  import { Button, Input, Badge, Card, Table } from "@nba/ui";
  import type { Product } from './products-manager-types';

  let {
    filteredProducts = [],
    category,
    searchTerm = $bindable(''),
    openDropdownId = $bindable(null),
    onStartEdit,
    onToggleActive,
    onArchive,
    onToggleDropdown
  }: {
    filteredProducts: Product[];
    category?: number | 'all';
    searchTerm: string;
    openDropdownId: number | null;
    onStartEdit: (p: Product) => void;
    onToggleActive: (p: Product) => void;
    onArchive: (p: Product) => void;
    onToggleDropdown: (id: number, e: MouseEvent) => void;
  } = $props();
</script>

<Card.Root class="md:col-span-3">
  <Card.Header class="pb-2 border-b border-border">
    <Card.Title class="text-lg font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <span class="flex items-center gap-2">
        <ShoppingBag class="w-5 h-5 text-primary" />
        Liste des articles
      </span>
      <div class="relative shrink-0">
        <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher..."
          bind:value={searchTerm}
          class="pl-8 pr-3 py-1.5 w-full sm:w-48 text-xs h-8"
        />
      </div>
    </Card.Title>
  </Card.Header>
  <Card.Content class="pt-4">
    <div class="overflow-x-auto min-h-[180px]">
      <Table.Root>
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
              <Table.Row class="hover:bg-muted/50 transition-colors">
                <Table.Cell class="font-medium">
                  {product.name}
                </Table.Cell>
                {#if !category || category === 'all'}
                  <Table.Cell>
                    <Badge variant="secondary" class="bg-primary/10 text-primary hover:bg-primary/10 font-semibold">
                      {product.category === 'shuttlecock' ? 'Volants' : product.category === 'string' ? 'Cordages' : 'Autre'}
                    </Badge>
                  </Table.Cell>
                {/if}
                <Table.Cell class="font-semibold text-foreground">
                  {((product.priceCents ?? product.price ?? 0) / 100).toFixed(2)} €
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
                  <div class="inline-block text-left">
                    <Button 
                      variant="ghost"
                      size="icon"
                      onclick={(e) => onToggleDropdown(product.id, e)} 
                      class="text-muted-foreground hover:text-foreground h-8 w-8 cursor-pointer" 
                      aria-label="Actions"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </Button>

                    {#if openDropdownId === product.id}
                      <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border">
                        <Button
                          variant="ghost"
                          onclick={(e) => { e.stopPropagation(); onStartEdit(product); }}
                          class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent justify-start h-auto"
                        >
                          <Edit class="w-3.5 h-3.5" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          onclick={(e) => { e.stopPropagation(); onArchive(product); }}
                          class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent justify-start h-auto"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                          Désactiver
                        </Button>
                      </div>
                    {/if}
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>
