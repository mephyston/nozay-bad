<script lang="ts">
  import { Plus, Edit, Trash2, Check, AlertCircle, ShoppingBag, Search, X, MoreVertical } from "lucide-svelte";

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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
  <div class="flex items-center justify-between border-b border-border pb-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">
        {category === 'shuttlecock' ? 'Gestion des Volants' : category === 'string' ? 'Gestion des Cordages' : category === 'other' ? 'Gestion des Autres Produits' : 'Gestion des Produits'}
      </h1>
      <p class="text-muted-foreground mt-1">
        Consultez et modifiez les tarifs, stocks et statuts de la boutique.
      </p>
    </div>
  </div>

  <div class="grid gap-6 md:grid-cols-5">
    <!-- Formulaire (Col span 2) -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm md:col-span-2 space-y-4 h-fit">
      <h2 class="text-lg font-semibold flex items-center justify-between border-b border-border pb-2">
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
          <button 
            type="button" 
            onclick={resetForm} 
            class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border px-2 py-1 rounded"
          >
            <X class="w-3 h-3" /> Annuler
          </button>
        {/if}
      </h2>

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
          <input
            type="text"
            id="name"
            placeholder="Ex: Babolat Tour..."
            bind:value={name}
            class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
          <input
            type="number"
            id="price"
            step="0.01"
            min="0"
            placeholder="0.00"
            bind:value={price}
            class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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

        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter le produit'}
        </button>
      </form>
    </div>

    <!-- Liste (Col span 3) -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm md:col-span-3 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-2">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <ShoppingBag class="w-5 h-5 text-primary" />
          Liste des articles
        </h2>
        <div class="relative shrink-0">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            bind:value={searchTerm}
            class="pl-8 pr-3 py-1.5 w-full sm:w-48 border border-border bg-background rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div class="overflow-x-auto min-h-[180px]">
        <table class="w-full text-sm text-left border-collapse">
          <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
            <tr>
              <th class="p-4">Nom</th>
              {#if !category || category === 'all'}
                <th class="p-4">Catégorie</th>
              {/if}
              <th class="p-4">Prix</th>
              <th class="p-4">Statut</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#if filteredProducts.length === 0}
              <tr>
                <td colspan={!category || category === 'all' ? 5 : 4} class="p-4 text-center text-muted-foreground text-sm">
                  Aucun article trouvé.
                </td>
              </tr>
            {:else}
              {#each filteredProducts as product (product.id)}
                <tr class="hover:bg-muted/50 transition-colors">
                  <td class="p-4 font-medium">
                    {product.name}
                  </td>
                  {#if !category || category === 'all'}
                    <td class="p-4">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {product.category === 'shuttlecock' ? 'Volants' : product.category === 'string' ? 'Cordages' : 'Autre'}
                      </span>
                    </td>
                  {/if}
                  <td class="p-4 font-semibold text-foreground">
                    {(product.price / 100).toFixed(2)} €
                  </td>
                  <td class="p-4">
                    <button 
                      type="button" 
                      onclick={() => handleToggleActive(product)}
                      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors border border-transparent hover:border-border cursor-pointer bg-transparent"
                      title="Cliquer pour changer le statut"
                    >
                      {#if product.active}
                        <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <span class="text-emerald-600 dark:text-emerald-400">Actif</span>
                      {:else}
                        <span class="h-2 w-2 rounded-full bg-muted-foreground"></span>
                        <span class="text-muted-foreground">Inactif</span>
                      {/if}
                    </button>
                  </td>
                  <td class="p-4 text-right relative">
                    <div class="inline-block text-left">
                      <button 
                        type="button"
                        onclick={(e) => toggleDropdown(product.id, e)} 
                        class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                        aria-label="Actions"
                      >
                        <MoreVertical class="w-4 h-4" />
                      </button>

                      {#if openDropdownId === product.id}
                        <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border">
                          <button
                            type="button"
                            onclick={(e) => { e.stopPropagation(); startEdit(product); openDropdownId = null; }}
                            class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                          >
                            <Edit class="w-3.5 h-3.5" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            onclick={(e) => { e.stopPropagation(); handleArchive(product); openDropdownId = null; }}
                            class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                            Désactiver
                          </button>
                        </div>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
