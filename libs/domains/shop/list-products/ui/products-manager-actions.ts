import { uiConfirm, flashAndReload } from '@nba/ui';
import type { Product } from './products-manager-types';

export async function submitProduct(params: {
  editingId: number | null;
  name: string;
  price: string;
  category?: number | 'all';
  formCategory: string;
  active: boolean;
  trackStock: boolean;
  stock: string;
}): Promise<{ success: boolean; error?: string }> {
  const numPrice = parseFloat(params.price);

  if (!params.name.trim()) {
    return { success: false, error: 'Le nom du produit est requis.' };
  }
  if (isNaN(numPrice) || numPrice < 0) {
    return { success: false, error: 'Le prix doit être supérieur ou égal à 0.' };
  }

  const priceCents = Math.round(numPrice * 100);
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

  const res = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errMsg = await res.text();
    return { success: false, error: errMsg || "Erreur lors de l'enregistrement." };
  }

  flashAndReload(params.editingId ? 'Produit mis à jour.' : 'Produit créé.');

  return { success: true };
}

export async function toggleProductActive(product: Product): Promise<boolean> {
  const res = await fetch('', {
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

  const res = await fetch('', {
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
