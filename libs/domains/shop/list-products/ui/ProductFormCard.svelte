<script lang="ts">
  import { SwitchField, SearchableCombobox, MediaField, Input, Textarea, FormField } from '@nba/ui';
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

  function onFile(file: File) {
    values.imageFile = file;
    values.removeImage = false;
  }

  function clearImage() {
    values.imageFile = null;
    values.removeImage = currentImageUrl !== null;
  }
</script>

<!--
  L'explication passe par le `hint` du bloc plutôt que par un paragraphe fait main :
  une aide n'a pas besoin d'une icône de domaine pour s'annoncer, et celle-ci
  décalait le texte sans rien dire de plus.
-->
<FormField
  id="parent"
  label="Déclinaison de"
  hint="Une déclinaison est une taille, une couleur… d'un produit existant : la boutique la propose au choix sur la carte du produit."
>
  <SearchableCombobox
    id="parent"
    items={parentItems}
    bind:value={values.parentId}
    placeholder="Aucun — produit à part entière"
    searchPlaceholder="Rechercher un produit…"
  />
</FormField>

{#if isVariant}
  <FormField
    id="variantLabel"
    label="Libellé de la déclinaison"
    hint={parent
      ? `Nom, catégorie, description et image sont ceux de « ${parent.name} » et se modifient sur sa fiche.`
      : undefined}
  >
    <Input id="variantLabel" type="text" placeholder="Ex : L, 12 ans, Rouge…" bind:value={values.variantLabel} maxlength={40} required />
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
    <MediaField
      id="image"
      label="Image"
      {preview}
      hint="PNG, JPEG ou WebP, 8 Mo au plus. Réduite automatiquement."
      onSelect={onFile}
      onClear={clearImage}
    />
  </FormField>
{/if}

<FormField id="price" label="Prix (€)">
  <Input type="number" id="price" step="0.01" min="0" placeholder="0.00" bind:value={values.price} required class="font-outfit tabular-nums" />
</FormField>

<!--
  Des réglages, donc des interrupteurs : l'état se lit toujours au même endroit,
  à droite, là où des cases le plaçaient après des libellés de longueurs inégales.
-->
<SwitchField
  id="trackStock"
  label="Gérer le stock pour {isVariant ? 'cette déclinaison' : 'ce produit'}"
  bind:checked={values.trackStock}
/>

{#if values.trackStock}
  <FormField id="stock" label="Quantité en stock">
    <Input type="number" id="stock" min="0" placeholder="Ex : 50" bind:value={values.stock} required class="font-outfit tabular-nums" />
  </FormField>
{/if}

<SwitchField
  id="active"
  label={isVariant ? 'Déclinaison proposée aux adhérents' : 'Produit actif'}
  hint={isVariant ? undefined : 'Visible par les adhérents dans la boutique.'}
  bind:checked={values.active}
/>
