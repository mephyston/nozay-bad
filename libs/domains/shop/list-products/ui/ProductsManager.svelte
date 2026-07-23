<script lang="ts">
  import { Plus, Edit, Trash2, Check, AlertCircle, ShoppingBag, Search, X, MoreVertical } from "@lucide/svelte";
  import { Button, Input, Badge, Card, Table } from "@metacult/shared-ui";


  interface Product {
    id: number;
    name: string;
    category: 'shuttlecock' | 'string' | 'other';
    price: number;
    stock: number;
    active: boolean;
    createdAt: string;
  }

  let {
    category,
    products = []
  }: {
    category?: 'shuttlecock' | 'string' | 'other' | 'all';
    products?: Product[];
  } = $props();

  // svelte-ignore state_referenced_locally
  let formCategory = $state<'shuttlecock' | 'string' | 'other'>(
    category && category !== 'all' ? category : 'shuttlecock'
  );

  // Local state
  // svelte-ignore state_referenced_locally
  let productsList = $state<Product[]>(products);
  let searchTerm = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');

  // Form state
  let editingId = $state<number | null>(null);
  let name = $state('');
  let price = $state(''); // Decimal string
  let active = $state(true);

  // Sync state if products prop changes
  $effect(() => {
    productsList = products;
  });

  // Derived filtered products
  let filteredProducts = $derived(
    productsList.filter(prod => {
      const term = searchTerm.toLowerCase();
      return (
        prod.name.toLowerCase().includes(term) ||
        (prod.price / 100).toFixed(2).includes(term) ||
        prod.stock.toString().includes(term)
      );
    })
  );

  function resetForm() {
    editingId = null;
    name = '';
    price = '';
    active = true;
    errorMsg = '';
    formCategory = category && category !== 'all' ? category : 'shuttlecock';
  }

  function startEdit(product: Product) {
    editingId = product.id;
    name = product.name;
    price = (product.price / 100).toString();
    active = product.active;
    formCategory = product.category;
    errorMsg = '';
    successMsg = '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    successMsg = '';

    const numPrice = parseFloat(price);

    if (!name.trim()) {
      errorMsg = 'Le nom du produit est requis.';
      return;
    }

    if (isNaN(numPrice) || numPrice < 0) {
      errorMsg = 'Le prix doit être supérieur ou égal à 0.';
      return;
    }

    isSubmitting = true;

    try {
      const priceCents = Math.round(numPrice * 100);
      const payload = editingId
        ? {
            action: 'update',
            id: editingId,
            name: name.trim(),
            price: priceCents,
            stock: 9999,
            active
          }
        : {
            action: 'create',
            name: name.trim(),
            category: category && category !== 'all' ? category : formCategory,
            price: priceCents,
            stock: 9999,
            active
          };

      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Erreur lors de l'enregistrement.");
      }

      successMsg = editingId
        ? 'Produit mis à jour avec succès !'
        : 'Produit ajouté avec succès !';

      resetForm();
      
      // Reload page to refresh data from server binding
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  async function handleToggleActive(product: Product) {
    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          active: !product.active
        })
      });

      if (!res.ok) throw new Error('Impossible de modifier le statut.');
      
      // Update local state immediately for a responsive feel
      const index = productsList.findIndex(p => p.id === product.id);
      if (index !== -1) {
        productsList[index].active = !product.active;
      }
    } catch (err: unknown) {
      alert(err.message);
    }
  }

  async function handleArchive(product: Product) {
    if (!confirm(`Êtes-vous sûr de vouloir désactiver le produit "${product.name}" ?`)) return;
    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          active: false
        })
      });

      if (!res.ok) throw new Error('Impossible de désactiver le produit.');
      
      // Update local state immediately
      const index = productsList.findIndex(p => p.id === product.id);
      if (index !== -1) {
        productsList[index].active = false;
      }
    } catch (err: unknown) {
      alert(err.message);
    }
  }

  let openDropdownId = $state<number | null>(null);

  function toggleDropdown(id: number, e: MouseEvent) {
    e.stopPropagation();
    openDropdownId = openDropdownId === id ? null : id;
  }

  $effect(() => {
    const handleGlobalClick = () => { openDropdownId = null; };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });
</script>

<div class="space-y-6">
  <div class="grid gap-6 md:grid-cols-5">
    <!-- Formulaire (Col span 2) -->
    <Card.Root class="md:col-span-2 h-fit">
      <Card.Header class="pb-2 border-b border-border">
        <Card.Title class="text-lg font-semibold flex items-center justify-between">
          <span class="flex items-center gap-2">
            {#if editingId}
              <Edit class="w-5 h-5 text-primary" />
              Modifier le produit
            {:else}
              <Plus class="w-5 h-5 text-primary" />
              Ajouter un produit
            {/if}
          </span>
          {#if editingId}
            <Button 
              type="button" 
              variant="outline"
              size="xs"
              onclick={resetForm} 
              class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X class="w-3 h-3" /> Annuler
            </Button>
          {/if}
        </Card.Title>
      </Card.Header>
      <Card.Content class="pt-4 space-y-4">
        {#if errorMsg}
          <div class="p-3 bg-destructive/15 border border-destructive/30 text-destructive text-xs rounded-md flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        {/if}

        {#if successMsg}
          <div class="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-md flex items-center gap-2">
            <Check class="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="space-y-4">
          <div>
            <label for="name" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Nom du produit</label>
            <Input
              type="text"
              id="name"
              placeholder="Ex: Babolat Tour..."
              bind:value={name}
              required
            />
          </div>

          {#if !category || category === 'all'}
            <div>
              <label for="category" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Catégorie</label>
              <select
                id="category"
                bind:value={formCategory}
                disabled={!!editingId}
                class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="shuttlecock">Volants</option>
                <option value="string">Cordages</option>
                <option value="other">Autre</option>
              </select>
            </div>
          {/if}

          <div>
            <label for="price" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Prix (€)</label>
            <Input
              type="number"
              id="price"
              step="0.01"
              min="0"
              placeholder="0.00"
              bind:value={price}
              required
            />
          </div>

          <div class="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="active"
              bind:checked={active}
              class="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
            />
            <label for="active" class="text-sm font-medium text-foreground cursor-pointer select-none">
              Produit actif (visible par les adhérents)
            </label>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            class="w-full cursor-pointer"
          >
            {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter le produit'}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>

    <!-- Liste (Col span 3) -->
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
                      {(product.price / 100).toFixed(2)} €
                    </Table.Cell>
                    <Table.Cell>
                      <Button 
                        variant="ghost" 
                        onclick={() => handleToggleActive(product)}
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
                          onclick={(e) => toggleDropdown(product.id, e)} 
                          class="text-muted-foreground hover:text-foreground h-8 w-8 cursor-pointer" 
                          aria-label="Actions"
                        >
                          <MoreVertical class="w-4 h-4" />
                        </Button>

                        {#if openDropdownId === product.id}
                          <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border">
                            <Button
                              variant="ghost"
                              onclick={(e) => { e.stopPropagation(); startEdit(product); openDropdownId = null; }}
                              class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent justify-start h-auto"
                            >
                              <Edit class="w-3.5 h-3.5" />
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              onclick={(e) => { e.stopPropagation(); handleArchive(product); openDropdownId = null; }}
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
  </div>
</div>
