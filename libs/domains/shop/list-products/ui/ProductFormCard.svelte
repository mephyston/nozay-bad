<script lang="ts">
  import { Checkbox, SearchableCombobox, Input, Textarea, FormField, Button } from '@nba/ui';
  import { ImagePlus, Trash2, Layers } from '@lucide/svelte';
  import type { ProductFormValues } from './products-manager-actions';
  import { productLabel, type Product, type ProductCategory } from './products-manager-types';

  /**
   * Les champs d'une fiche produit.
   *
   * Une fiche est un produit à part entière, ou la **déclinaison** d'un autre : c'est le
   * champ « Déclinaison de » qui décide, et il change le formulaire. Une déclinaison
   * n'a qu'un libellé, un prix et un stock — nom, catégorie, description et image
   * sont ceux du parent, et se modifient sur sa fiche.
   *
   * L'image se choisit ici mais ne part qu'à l'enregistrement, après la fiche : une
   * création n'a pas encore d'identifiant à lui donner.
   */
  let {
    values = $bindable(),
    categories = [],
    parentCandidates = [],
    currentImageUrl = null
  }: {
    values: ProductFormValues;
    categories: ProductCategory[];
    /** Produits pouvant servir de parent : ceux qui ne sont pas eux-mêmes une déclinaison, sauf la fiche en cours. */
    parentCandidates: Product[];
    /** Adresse de l'image en place, servie par le site public. */
    currentImageUrl?: string | null;
  } = $props();

  const NONE = 0;
  const isVariant = $derived(values.parentId > 0);
  const parent = $derived(parentCandidates.find((p) => p.id === values.parentId) ?? null);

  const categoryItems = $derived(categories.map((c) => ({ label: c.label, value: c.id })));
  const parentItems = $derived([
    { label: 'Aucun — produit à part entière', value: NONE },
    ...parentCandidates.map((p) => ({ label: productLabel(p), value: p.id }))
  ]);

  /** Aperçu du fichier choisi, révoqué dès qu'il change : un objet URL retenu fuit. */
  let pendingPreview = $state<string | null>(null);
  $effect(() => {
    const file = values.imageFile;
    if (!file) {
      pendingPreview = null;
      return;
    }
    const url = URL.createObjectURL(file);
    pendingPreview = url;
    return () => URL.revokeObjectURL(url);
  });

  const preview = $derived(pendingPreview ?? (values.removeImage ? null : currentImageUrl));

  function onFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      values.imageFile = file;
      values.removeImage = false;
    }
    input.value = '';
  }

  function clearImage() {
    values.imageFile = null;
    values.removeImage = currentImageUrl !== null;
  }
</script>

<FormField id="parent" label="Déclinaison de">
  <SearchableCombobox
    id="parent"
    items={parentItems}
    bind:value={values.parentId}
    placeholder="Aucun — produit à part entière"
    searchPlaceholder="Rechercher un produit…"
  />
  <p class="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
    <Layers class="w-3.5 h-3.5 shrink-0 mt-px" />
    <span>Une déclinaison est une taille, une couleur… d'un produit existant : la boutique la propose au choix sur la carte du produit.</span>
  </p>
</FormField>

{#if isVariant}
  <FormField id="variantLabel" label="Libellé de la déclinaison">
    <Input id="variantLabel" type="text" placeholder="Ex : L, 12 ans, Rouge…" bind:value={values.variantLabel} maxlength={40} required />
    {#if parent}
      <p class="text-xs text-muted-foreground mt-1.5">
        Nom, catégorie, description et image sont ceux de « {parent.name} » et se modifient sur sa fiche.
      </p>
    {/if}
  </FormField>
{:else}
  <FormField id="name" label="Nom du produit">
    <Input id="name" type="text" placeholder="Ex : Maillot du club, Yonex BG65…" bind:value={values.name} required />
  </FormField>

  <FormField id="category" label="Catégorie">
    <SearchableCombobox
      id="category"
      items={categoryItems}
      bind:value={values.categoryId}
      placeholder={categoryItems.length === 0 ? 'Aucune catégorie active' : 'Choisir une catégorie…'}
      searchPlaceholder="Rechercher…"
    />
  </FormField>

  <FormField id="description" label="Description (facultative)">
    <Textarea id="description" rows={2} maxlength={500} placeholder="Ce que l'adhérent lit sous le nom : matière, contenu du tube, délai…" bind:value={values.description} />
  </FormField>

  <FormField id="image" label="Image">
    <div class="flex items-center gap-4">
      <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
        {#if preview}
          <img src={preview} alt="" class="h-full w-full object-contain" />
        {:else}
          <ImagePlus class="h-6 w-6 text-muted-foreground" />
        {/if}
      </div>
      <div class="flex flex-col gap-2">
        <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted">
          <ImagePlus class="h-4 w-4" />
          <span>{preview ? 'Remplacer' : 'Choisir une image'}</span>
          <input id="image" type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" onchange={onFile} />
        </label>
        {#if preview}
          <Button type="button" variant="ghost" size="sm" class="justify-start gap-1.5 text-muted-foreground" onclick={clearImage}>
            <Trash2 class="h-4 w-4" /> Retirer
          </Button>
        {/if}
        <p class="text-xs text-muted-foreground">PNG, JPEG ou WebP, 8 Mo au plus. Réduite automatiquement.</p>
      </div>
    </div>
  </FormField>
{/if}

<FormField id="price" label="Prix (€)">
  <Input type="number" id="price" step="0.01" min="0" placeholder="0.00" bind:value={values.price} required class="font-outfit tabular-nums" />
</FormField>

<div class="flex items-center gap-2 py-2">
  <Checkbox id="trackStock" bind:checked={values.trackStock} />
  <label for="trackStock" class="text-sm font-medium text-foreground cursor-pointer select-none">
    Gérer le stock pour {isVariant ? 'cette déclinaison' : 'ce produit'}
  </label>
</div>

{#if values.trackStock}
  <FormField id="stock" label="Quantité en stock">
    <Input type="number" id="stock" min="0" placeholder="Ex : 50" bind:value={values.stock} required class="font-outfit tabular-nums" />
  </FormField>
{/if}

<div class="flex items-center gap-2 py-2">
  <Checkbox id="active" bind:checked={values.active} />
  <label for="active" class="text-sm font-medium text-foreground cursor-pointer select-none">
    {isVariant ? 'Déclinaison proposée aux adhérents' : 'Produit actif (visible par les adhérents)'}
  </label>
</div>
