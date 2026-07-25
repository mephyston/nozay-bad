<script lang="ts">
  import { Plus, Edit } from "@lucide/svelte";
  import { Sheet, toast } from "@nba/ui";
  import type { Product } from './products-manager-types';
  import { submitProduct, toggleProductActive, archiveProduct } from './products-manager-actions';
  import ProductFormCard from './ProductFormCard.svelte';
  import ProductListTable from './ProductListTable.svelte';

  export * from './products-manager-types';
  export * from './products-manager-actions';

  let {
    category,
    products = []
  }: {
    category?: number | 'all';
    products?: Product[];
  } = $props();

  let formCategory = $state<string>('shuttlecock');
  // svelte-ignore state_referenced_locally
  let productsList = $state<Product[]>(products);
  let searchTerm = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');
  let showFormSheet = $state(false);

  let editingId = $state<number | null>(null);
  let name = $state('');
  let price = $state('');
  let active = $state(true);

  $effect(() => {
    productsList = products;
  });

  let filteredProducts = $derived(
    productsList.filter(prod => {
      const term = searchTerm.toLowerCase();
      const priceVal = prod.priceCents ?? prod.price ?? 0;
      return (
        prod.name.toLowerCase().includes(term) ||
        (priceVal / 100).toFixed(2).includes(term) ||
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
  }

  function openAddForm() {
    resetForm();
    showFormSheet = true;
  }

  function startEdit(product: Product) {
    editingId = product.id;
    name = product.name;
    const priceVal = product.priceCents ?? product.price ?? 0;
    price = (priceVal / 100).toString();
    active = product.active;
    errorMsg = '';
    successMsg = '';
    showFormSheet = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    successMsg = '';
    isSubmitting = true;

    const res = await submitProduct({ editingId, name, price, category, formCategory, active });
    isSubmitting = false;

    if (res.success) {
      successMsg = editingId ? 'Produit mis à jour avec succès !' : 'Produit ajouté avec succès !';
      toast.success(successMsg);
      resetForm();
      showFormSheet = false;
    } else {
      errorMsg = res.error || 'Une erreur est survenue.';
      toast.error(errorMsg);
    }
  }

  async function handleToggleActive(product: Product) {
    try {
      const newActive = await toggleProductActive(product);
      const index = productsList.findIndex(p => p.id === product.id);
      if (index !== -1) {
        productsList[index].active = newActive;
      }
      toast.success(newActive ? 'Produit activé !' : 'Produit désactivé !');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleArchive(product: Product) {
    try {
      const archived = await archiveProduct(product);
      if (archived) {
        const index = productsList.findIndex(p => p.id === product.id);
        if (index !== -1) {
          productsList[index].active = false;
        }
      }
      toast.success('Produit archivé !');
    } catch (err: any) {
      toast.error(err.message);
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
  <ProductListTable
    {filteredProducts}
    {category}
    bind:searchTerm
    bind:openDropdownId
    onOpenAdd={openAddForm}
    onStartEdit={(p) => { startEdit(p); openDropdownId = null; }}
    onToggleActive={handleToggleActive}
    onArchive={(p) => { handleArchive(p); openDropdownId = null; }}
    onToggleDropdown={toggleDropdown}
  />
</div>

<Sheet.Root bind:open={showFormSheet}>
  <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        {#if editingId}
          <Edit class="w-5 h-5 text-primary" />
          Modifier le produit
        {:else}
          <Plus class="w-5 h-5 text-primary" />
          Nouveau produit
        {/if}
      </Sheet.Title>
      <Sheet.Description>
        {#if editingId}
          Modifiez les informations du produit ci-dessous.
        {:else}
          Renseignez le nom, la catégorie et le prix du nouveau produit.
        {/if}
      </Sheet.Description>
    </Sheet.Header>

    <ProductFormCard
      {editingId}
      bind:name
      bind:price
      bind:active
      bind:formCategory
      {category}
      {isSubmitting}
      {errorMsg}
      {successMsg}
      onReset={resetForm}
      onSubmit={handleSubmit}
    />
  </Sheet.Content>
</Sheet.Root>
