<script module>
  export * from './products-manager-types';
  export * from './products-manager-actions';
</script>
<script lang="ts">
  import { Plus, Edit } from "@lucide/svelte";
  import { Sheet, submitForm, toast } from "@nba/ui";
  import type { Product } from './products-manager-types';
  import { submitProduct, validateProduct, toggleProductActive, archiveProduct } from './products-manager-actions';
  import ProductFormCard from './ProductFormCard.svelte';
  import ProductListTable from './ProductListTable.svelte';

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
  let showFormSheet = $state(false);

  let editingId = $state<number | null>(null);
  let name = $state('');
  let price = $state('');
  let active = $state(true);
  let trackStock = $state(false);
  let stock = $state('');

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
    trackStock = false;
    stock = '';
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
    trackStock = !!product.trackStock;
    stock = product.stock ? product.stock.toString() : '';
    errorMsg = '';
    showFormSheet = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    isSubmitting = true;

    const values = { editingId, name, price, category, formCategory, active, trackStock, stock };
    await submitForm({
      validate: () => validateProduct(values),
      submit: () => submitProduct(values),
      success: editingId ? 'Produit mis à jour.' : 'Produit créé.',
      close: () => { resetForm(); showFormSheet = false; },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => { errorMsg = message; }
    });

    isSubmitting = false;
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
</script>

<div class="space-y-6">
  <ProductListTable
    {filteredProducts}
    {category}
    bind:searchTerm
    onOpenAdd={openAddForm}
    onStartEdit={(p) => { startEdit(p); }}
    onToggleActive={handleToggleActive}
    onArchive={(p) => { handleArchive(p); }}
  />
</div>

<Sheet.Root bind:open={showFormSheet}>
  <Sheet.Content size="md" class="overflow-y-auto">
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
      bind:trackStock
      bind:stock
      bind:formCategory
      {category}
      {isSubmitting}
      {errorMsg}
      onReset={resetForm}
      onSubmit={handleSubmit}
    />
  </Sheet.Content>
</Sheet.Root>
