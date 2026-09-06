import { uiConfirm, readApiError } from '@nba/ui';
import type { Product } from './products-manager-types';

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
  price: string;
  category?: number | 'all';
  formCategory: string;
  active: boolean;
  trackStock: boolean;
  stock: string;
}

export function validateProduct(params: ProductFormValues): string | null {
  if (!params.name.trim()) {
    return 'Le nom du produit est requis.';
  }
  const numPrice = parseFloat(params.price);
  if (isNaN(numPrice) || numPrice < 0) {
    return 'Le prix doit être supérieur ou égal à 0.';
  }
  return null;
}

export async function submitProduct(params: ProductFormValues): Promise<void> {
  const priceCents = Math.round(parseFloat(params.price) * 100);
  const payload = params.editingId
    ? {
        action: 'update',
        id: params.editingId,
        name: params.name.trim(),
        price: priceCents,
        stock: params.trackStock ? (parseInt(params.stock as string) || 0) : 0,
        trackStock: params.trackStock,
        active: params.active
      }
    : {
        action: 'create',
        name: params.name.trim(),
        category: params.category && params.category !== 'all' ? params.category : params.formCategory,
        price: priceCents,
        stock: params.trackStock ? (parseInt(params.stock as string) || 0) : 0,
        trackStock: params.trackStock,
        active: params.active
      };

  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(await readApiError(res, "Erreur lors de l'enregistrement."));
  }
}

export async function toggleProductActive(product: Product): Promise<boolean> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      id: product.id,
      name: product.name,
      priceCents: product.price ?? product.priceCents,
      stock: product.stock,
      trackStock: product.trackStock,
      active: !product.active
    })
  });
  if (!res.ok) throw new Error('Impossible de modifier le statut.');
  return !product.active;
}

export async function archiveProduct(product: Product): Promise<boolean> {
  if (!(await uiConfirm(`Êtes-vous sûr de vouloir désactiver le produit "${product.name}" ?`))) return false;

  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      id: product.id,
      name: product.name,
      priceCents: product.price ?? product.priceCents,
      stock: product.stock,
      trackStock: product.trackStock,
      active: false
    })
  });
  if (!res.ok) throw new Error('Impossible de désactiver le produit.');
  return true;
}
