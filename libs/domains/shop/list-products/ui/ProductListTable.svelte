<script lang="ts">
  import { Edit, Trash2, Plus, CornerDownRight, ImageIcon, Layers, Power, PowerOff } from "@lucide/svelte";
  import { Button, Badge, Amount, DropdownMenu, DataTable, DataTableToolbar, DataTableRowActions, Table, Card } from "@nba/ui";
  import { canDelete, isVariant, type Product } from './products-manager-types';

  /**
   * Le catalogue, dans l'ordre de l'API : un produit puis ses déclinaisons, en retrait.
   *
   * Un parent qui a des déclinaisons n'a ni prix ni stock à lui — ce sont les siennes
   * qui comptent — : sa ligne dit combien il en a. La vignette n'apparaît que sur lui.
   */
  let {
    filteredProducts = [],
    searchTerm = $bindable(''),
    canWrite = false,
    imageUrl,
    onStartEdit,
    onAddVariant,
    onSetActive,
    onDelete,
    onOpenAdd
  }: {
    filteredProducts?: Product[];
    searchTerm?: string;
    canWrite?: boolean;
    imageUrl: (key: string | null | undefined) => string | null;
    onStartEdit: (p: Product) => void;
    onAddVariant: (p: Product) => void;
    onSetActive: (p: Product, active: boolean) => void;
    onDelete: (p: Product) => void;
    onOpenAdd?: () => void;
  } = $props();

  const hasVariants = (p: Product) => (p.variantCount ?? 0) > 0;
</script>

{#snippet thumbnail(product: Product, size: string)}
  {@const src = imageUrl(product.imageKey)}
  <div class="{size} shrink-0 overflow-hidden rounded-md border border-border bg-muted/30 flex items-center justify-center">
    {#if src}
      <img {src} alt="" loading="lazy" class="h-full w-full object-contain" />
    {:else}
      <ImageIcon class="h-4 w-4 text-muted-foreground/60" />
    {/if}
  </div>
{/snippet}

{#snippet status(product: Product)}
  <Button
    variant="ghost"
    disabled={!canWrite}
    onclick={() => onSetActive(product, !product.active)}
    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors border border-transparent hover:border-border cursor-pointer bg-transparent h-auto"
    title={canWrite ? 'Cliquer pour changer le statut' : undefined}
  >
    {#if product.active}
      <span class="h-2 w-2 rounded-full bg-success"></span>
      <span class="text-success">Actif</span>
    {:else}
      <span class="h-2 w-2 rounded-full bg-muted-foreground"></span>
      <span class="text-muted-foreground">Inactif</span>
    {/if}
  </Button>
{/snippet}

{#snippet actions(product: Product)}
  <DropdownMenu.Label>Actions</DropdownMenu.Label>
  <DropdownMenu.Item onclick={() => onStartEdit(product)} class="cursor-pointer">
    <Edit class="w-3.5 h-3.5 mr-2" /> Modifier
  </DropdownMenu.Item>
  {#if !isVariant(product)}
    <DropdownMenu.Item onclick={() => onAddVariant(product)} class="cursor-pointer">
      <Layers class="w-3.5 h-3.5 mr-2" /> Ajouter une déclinaison
    </DropdownMenu.Item>
  {/if}
  {#if product.active}
    <DropdownMenu.Item onclick={() => onSetActive(product, false)} class="cursor-pointer">
      <PowerOff class="w-3.5 h-3.5 mr-2" /> Désactiver
    </DropdownMenu.Item>
  {:else}
    <DropdownMenu.Item onclick={() => onSetActive(product, true)} class="cursor-pointer">
      <Power class="w-3.5 h-3.5 mr-2" /> Activer
    </DropdownMenu.Item>
  {/if}
  {#if canDelete(product)}
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={() => onDelete(product)} class="text-destructive focus:text-destructive cursor-pointer">
      <Trash2 class="w-3.5 h-3.5 mr-2" /> Supprimer
    </DropdownMenu.Item>
  {/if}
{/snippet}

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
        {#if onOpenAdd && canWrite}
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
      <div class="p-6 text-center text-muted-foreground text-sm">Aucun article trouvé.</div>
    {:else}
      {#each filteredProducts as product (product.id)}
        <Card.Root class={isVariant(product) ? 'ml-4 border-l-2 border-l-primary/30' : ''}>
          <Card.Content class="p-4 space-y-3">
            <div class="flex items-start gap-3">
              {#if !isVariant(product)}
                {@render thumbnail(product, 'h-12 w-12')}
              {:else}
                <CornerDownRight class="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              {/if}
              <div class="min-w-0 flex-1">
                <h4 class="font-bold text-sm text-foreground truncate">
                  {isVariant(product) ? product.variantLabel : product.name}
                </h4>
                {#if !isVariant(product)}
                  <div class="mt-1 flex flex-wrap gap-1">
                    <Badge variant="primary-soft" size="xs">{product.categoryLabel ?? 'Autre'}</Badge>
                    {#if hasVariants(product)}
                      <Badge variant="outline" size="xs">{product.variantCount} déclinaison{product.variantCount === 1 ? '' : 's'}</Badge>
                    {/if}
                  </div>
                {/if}
              </div>
              <div class="text-right shrink-0">
                {#if !hasVariants(product)}
                  <span class="font-bold text-base text-foreground block"><Amount cents={product.priceCents ?? product.price} /></span>
                  {#if product.trackStock}
                    <span class="text-xs {product.stock > 0 ? 'text-muted-foreground' : 'text-destructive font-semibold'} block mt-0.5">Stock : {product.stock}</span>
                  {/if}
                {/if}
                <div class="mt-0.5">{@render status(product)}</div>
              </div>
            </div>
            {#if canWrite}
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button variant="outline" size="sm" onclick={() => onStartEdit(product)} class="h-8 text-xs font-semibold gap-1.5 flex-1">
                  <Edit class="w-3.5 h-3.5" /> <span>Modifier</span>
                </Button>
                <DataTableRowActions>{@render actions(product)}</DataTableRowActions>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      {/each}
    {/if}
  {/snippet}

  {#snippet header()}
    <Table.Head>Article</Table.Head>
    <Table.Head>Catégorie</Table.Head>
    <Table.Head>Prix</Table.Head>
    <Table.Head>Stock</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(product)}
    <Table.Row>
      <Table.Cell class="font-medium">
        {#if isVariant(product)}
          <div class="flex items-center gap-2 pl-6 text-foreground">
            <CornerDownRight class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{product.variantLabel}</span>
          </div>
        {:else}
          <div class="flex items-center gap-3">
            {@render thumbnail(product, 'h-10 w-10')}
            <div class="min-w-0">
              <div class="truncate">{product.name}</div>
              {#if hasVariants(product)}
                <div class="text-xs text-muted-foreground">{product.variantCount} déclinaison{product.variantCount === 1 ? '' : 's'}</div>
              {/if}
            </div>
          </div>
        {/if}
      </Table.Cell>
      <Table.Cell>
        {#if !isVariant(product)}
          <Badge variant="primary-soft">{product.categoryLabel ?? 'Autre'}</Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="font-bold text-foreground">
        {#if !hasVariants(product)}
          <Amount cents={product.priceCents ?? product.price} />
        {:else}
          <span class="text-muted-foreground text-xs italic font-normal">selon déclinaison</span>
        {/if}
      </Table.Cell>
      <Table.Cell>
        {#if hasVariants(product)}
          <span class="text-muted-foreground text-xs italic">-</span>
        {:else if product.trackStock}
          <Badge variant={product.stock > 0 ? "outline" : "destructive"}>{product.stock}</Badge>
        {:else}
          <span class="text-muted-foreground text-xs italic">-</span>
        {/if}
      </Table.Cell>
      <Table.Cell>{@render status(product)}</Table.Cell>
      <Table.Cell class="text-right relative">
        {#if canWrite}
          <DataTableRowActions>{@render actions(product)}</DataTableRowActions>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
