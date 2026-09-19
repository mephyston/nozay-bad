<script lang="ts">
  import { Plus, Edit, Layers } from "@lucide/svelte";
  import { FormSheet, submitForm, toast, flashAndReload } from "@nba/ui";
  import { isVariant, productLabel, type Product, type ProductCategory } from './products-manager-types';
  import {
    submitProduct,
    validateProduct,
    setProductActive,
    deactivateProduct,
    deleteProduct,
    type ProductFormValues
  } from './products-manager-actions';
  import ProductFormCard from './ProductFormCard.svelte';
  import ProductListTable from './ProductListTable.svelte';

  /**
   * Le catalogue de la boutique, côté administration.
   *
   * Un produit se crée, se modifie — catégorie comprise —, se décline, s'illustre, se
   * désactive, et se supprime tant qu'il n'a jamais été commandé. Les images sont
   * servies par le site public : `mediaOrigin` est son adresse, passée par l'écran.
   */
  let {
    products = [],
    productCategories = [],
    mediaOrigin = '',
    canWrite = true
  }: {
    products?: Product[];
    productCategories?: ProductCategory[];
    mediaOrigin?: string;
    canWrite?: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let productsList = $state<Product[]>(products);
  $effect(() => {
    productsList = products;
  });

  let searchTerm = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let showFormSheet = $state(false);
  let editing = $state<Product | null>(null);
  let values = $state<ProductFormValues>(emptyValues());

  function emptyValues(): ProductFormValues {
    return {
      editingId: null,
      name: '',
      categoryId: 0,
      description: '',
      parentId: 0,
      variantLabel: '',
      price: '',
      active: true,
      trackStock: false,
      stock: '',
      imageFile: null,
      removeImage: false
    };
  }

  function imageUrl(key: string | null | undefined): string | null {
    return key ? `${mediaOrigin}/media/${key.replace(/^media\//, '')}` : null;
  }

  /**
   * La recherche garde la famille entière : une déclinaison trouvée montre son parent
   * au-dessus d'elle, un parent trouvé garde ses déclinaisons sous lui — sinon la
   * ligne « L » apparaîtrait seule, sans dire de quel produit.
   */
  let filteredProducts = $derived.by(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return productsList;
    const matches = new Set(
      productsList
        .filter((p) => {
          const priceVal = p.priceCents ?? p.price ?? 0;
          return (
            productLabel(p).toLowerCase().includes(term) ||
            (p.categoryLabel ?? '').toLowerCase().includes(term) ||
            (priceVal / 100).toFixed(2).includes(term)
          );
        })
        .map((p) => p.id)
    );
    const families = new Set<number>();
    for (const p of productsList) {
      if (matches.has(p.id)) families.add(p.parentId ?? p.id);
    }
    return productsList.filter((p) => families.has(p.parentId ?? p.id));
  });

  /** Parents possibles : un produit qui n'est pas lui-même une déclinaison, la fiche en cours exceptée. */
  let parentCandidates = $derived(productsList.filter((p) => !isVariant(p) && p.id !== editing?.id));

  function openAddForm() {
    editing = null;
    values = emptyValues();
    errorMsg = '';
    showFormSheet = true;
  }

  function openAddVariant(parent: Product) {
    editing = null;
    values = { ...emptyValues(), parentId: parent.id };
    errorMsg = '';
    showFormSheet = true;
  }

  function startEdit(product: Product) {
    editing = product;
    const priceVal = product.priceCents ?? product.price ?? 0;
    values = {
      editingId: product.id,
      name: product.name,
      categoryId: product.productCategoryId,
      description: product.description ?? '',
      parentId: product.parentId ?? 0,
      variantLabel: product.variantLabel ?? '',
      price: (priceVal / 100).toString(),
      active: product.active,
      trackStock: !!product.trackStock,
      stock: product.stock ? product.stock.toString() : '',
      imageFile: null,
      removeImage: false
    };
    errorMsg = '';
    showFormSheet = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    isSubmitting = true;
    const snapshot = $state.snapshot(values) as ProductFormValues;
    await submitForm({
      validate: () => validateProduct(snapshot),
      submit: () => submitProduct(snapshot),
      success: snapshot.editingId ? 'Produit mis à jour.' : 'Produit créé.',
      close: () => { showFormSheet = false; },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => { errorMsg = message; }
    });
    isSubmitting = false;
  }

  async function handleSetActive(product: Product, active: boolean) {
    try {
      if (active) {
        await setProductActive(product, true);
      } else if (!(await deactivateProduct(product))) {
        return;
      }
      const index = productsList.findIndex((p) => p.id === product.id);
      if (index !== -1) productsList[index].active = active;
      toast.success(active ? 'Produit activé.' : 'Produit désactivé.');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(product: Product) {
    try {
      if (await deleteProduct(product)) flashAndReload('Produit supprimé.');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const sheetTitle = $derived(
    editing ? (isVariant(editing) ? 'Modifier la déclinaison' : 'Modifier le produit')
      : values.parentId > 0 ? 'Nouvelle déclinaison' : 'Nouveau produit'
  );
  const sheetDescription = $derived(
    editing
      ? `${productLabel(editing)} : modifiez les informations ci-dessous.`
      : values.parentId > 0
        ? 'Une taille, une couleur… proposée au choix sur la carte du produit.'
        : 'Renseignez le nom, la catégorie et le prix. L’image et la description illustrent la carte dans la boutique.'
  );
</script>

<div class="space-y-6">
  <ProductListTable
    {filteredProducts}
    {canWrite}
    {imageUrl}
    bind:searchTerm
    onOpenAdd={openAddForm}
    onStartEdit={startEdit}
    onAddVariant={openAddVariant}
    onSetActive={handleSetActive}
    onDelete={handleDelete}
  />
</div>

<FormSheet
  bind:open={showFormSheet}
  title={sheetTitle}
  description={sheetDescription}
  icon={editing ? Edit : values.parentId > 0 ? Layers : Plus}
  error={errorMsg || null}
  {isSubmitting}
  submitLabel={editing ? 'Enregistrer les modifications' : values.parentId > 0 ? 'Ajouter la déclinaison' : 'Ajouter le produit'}
  onSubmit={handleSubmit}
>
  <ProductFormCard
    bind:values
    categories={productCategories}
    {parentCandidates}
    currentImageUrl={imageUrl(editing?.imageKey)}
  />
</FormSheet>
