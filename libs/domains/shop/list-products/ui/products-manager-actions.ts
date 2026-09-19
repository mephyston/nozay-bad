import { uiConfirm, readApiError } from '@nba/ui';
import { isVariant, productLabel, type Product } from './products-manager-types';

/**
 * Destination des écritures : le relais du domaine, et non la page hôte.
 *
 * Le catalogue de l'espace adhérent garde la sienne : il vit dans le storefront, et lui
 * donner une adresse d'administration l'aurait cassé sans que rien ne le signale.
 */
const RELAIS = '/admin/api/shop/products';

export interface ProductFormValues {
  editingId: number | null;
  name: string;
  /** `0` tant qu'aucune catégorie n'est choisie : le combobox ne sait pas dire « rien ». */
  categoryId: number;
  description: string;
  /** `0` pour un produit à part entière ; sinon le parent dont c'est une déclinaison. */
  parentId: number;
  variantLabel: string;
  price: string;
  active: boolean;
  trackStock: boolean;
  stock: string;
  /** Image choisie dans le formulaire, déposée après l'enregistrement de la fiche. */
  imageFile: File | null;
  /** L'image en place est à retirer à l'enregistrement. */
  removeImage: boolean;
}

export function validateProduct(values: ProductFormValues): string | null {
  const variant = values.parentId > 0;
  if (variant) {
    if (!values.variantLabel.trim()) return 'Indiquez ce qui distingue cette déclinaison : une taille, une couleur…';
  } else {
    if (!values.name.trim()) return 'Le nom du produit est requis.';
    if (!values.categoryId) return 'Choisissez la catégorie du produit.';
  }
  const numPrice = parseFloat(values.price);
  if (isNaN(numPrice) || numPrice < 0) return 'Le prix doit être supérieur ou égal à 0.';
  if (values.trackStock) {
    const stock = parseInt(values.stock);
    if (isNaN(stock) || stock < 0) return 'Le stock doit être un nombre positif ou nul.';
  }
  return null;
}

async function ecrire(payload: Record<string, unknown>, echec: string): Promise<any> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readApiError(res, echec));
  return res.json().catch(() => ({}));
}

/**
 * Enregistre la fiche, puis son image.
 *
 * Deux appels et non un : le dépôt d'un fichier passe en multipart, l'écriture d'une
 * fiche en JSON, et l'image a besoin de l'identifiant qu'une création ne rend qu'après
 * coup. L'ordre garantit qu'une fiche refusée ne laisse aucune image orpheline.
 */
export async function submitProduct(values: ProductFormValues): Promise<void> {
  const variant = values.parentId > 0;
  const priceCents = Math.round(parseFloat(values.price) * 100);
  const common = {
    priceCents,
    stock: values.trackStock ? parseInt(values.stock) || 0 : 0,
    trackStock: values.trackStock,
    active: values.active,
    parentId: variant ? values.parentId : null,
    variantLabel: variant ? values.variantLabel.trim() : null
  };
  const fiche = variant
    ? common
    : { ...common, name: values.name.trim(), productCategoryId: values.categoryId, description: values.description.trim() || null };

  const payload = values.editingId
    ? { action: 'update', id: values.editingId, ...fiche }
    : { action: 'create', ...fiche };
  const out = await ecrire(payload, "Erreur lors de l'enregistrement.");
  const id = values.editingId ?? Number(out?.data?.id);

  if (variant || !id) return;
  if (values.imageFile) {
    await uploadProductImage(id, values.imageFile);
  } else if (values.removeImage) {
    await ecrire({ action: 'remove_image', id }, "L'image n'a pas pu être retirée.");
  }
}

export async function uploadProductImage(id: number, file: File): Promise<void> {
  const form = new FormData();
  form.append('id', String(id));
  form.append('file', file);
  const res = await fetch(RELAIS, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await readApiError(res, "La fiche est enregistrée, mais l'image n'a pas pu être déposée."));
}

export async function setProductActive(product: Product, active: boolean): Promise<void> {
  await ecrire({ action: 'update', id: product.id, active }, 'Impossible de modifier le statut.');
}

/** Retire un produit du catalogue : ses déclinaisons, s'il en a, disparaissent avec lui de la vitrine. */
export async function deactivateProduct(product: Product): Promise<boolean> {
  const withVariants = (product.variantCount ?? 0) > 0;
  const ok = await uiConfirm({
    title: `Désactiver « ${productLabel(product)} » ?`,
    description: withVariants
      ? 'Le produit et toutes ses déclinaisons disparaîtront de la boutique. Vous pourrez le réactiver.'
      : 'Le produit disparaîtra de la boutique. Vous pourrez le réactiver.',
    confirmLabel: 'Désactiver'
  });
  if (!ok) return false;
  await setProductActive(product, false);
  return true;
}

/** Supprime un produit jamais commandé ; l'API refuse les autres, et l'écran ne le propose pas. */
export async function deleteProduct(product: Product): Promise<boolean> {
  const ok = await uiConfirm({
    title: `Supprimer « ${productLabel(product)} » ?`,
    description: isVariant(product)
      ? 'Cette déclinaison n’a jamais été commandée : elle sera définitivement supprimée.'
      : 'Ce produit n’a jamais été commandé : il sera définitivement supprimé.',
    confirmLabel: 'Supprimer',
    destructive: true
  });
  if (!ok) return false;
  await ecrire({ action: 'delete', id: product.id }, 'Impossible de supprimer le produit.');
  return true;
}
