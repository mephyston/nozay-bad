import { isOutOfStock, type Product } from './catalog-types';

/**
 * Une carte de la vitrine : un produit et, s'il en a, ses déclinaisons.
 *
 * L'API rend le catalogue à plat, un parent puis ses déclinaisons dans l'ordre de
 * leurs libellés. La vitrine, elle, affiche une carte par famille : c'est le parent
 * qu'on voit — nom, image, description —, et ce sont ses déclinaisons qu'on commande.
 */
export interface ProductFamily {
  /** Le produit affiché : le parent, ou le produit seul. */
  product: Product;
  /** Ses déclinaisons, dans l'ordre de l'API ; vide pour un produit seul. */
  variants: Product[];
  /** Ce qui se commande : les déclinaisons, ou le produit lui-même. */
  choices: Product[];
  priceMinCents: number;
  priceMaxCents: number;
  /** Rien n'est commandable : tout est en rupture. */
  soldOut: boolean;
}

export function groupFamilies(products: Product[]): ProductFamily[] {
  const byParent = new Map<number, Product[]>();
  for (const p of products) {
    if (p.parentId) byParent.set(p.parentId, [...(byParent.get(p.parentId) ?? []), p]);
  }

  return products
    .filter((p) => !p.parentId)
    .map((product) => {
      const variants = byParent.get(product.id) ?? [];
      // Un produit qui a des déclinaisons ne se commande jamais lui-même — même quand
      // toutes sont retirées de la liste : il est alors simplement indisponible.
      const declined = variants.length > 0 || (product.variantCount ?? 0) > 0;
      const choices = declined ? variants : [product];
      const prices = choices.length > 0 ? choices.map((c) => c.priceCents ?? (c as any).price ?? 0) : [product.priceCents ?? 0];
      return {
        product,
        variants,
        choices,
        priceMinCents: Math.min(...prices),
        priceMaxCents: Math.max(...prices),
        soldOut: choices.length === 0 || choices.every(isOutOfStock)
      };
    });
}

/** Les catégories représentées, dans l'ordre d'apparition, pour les puces de filtre. */
export function familyCategories(families: ProductFamily[]): { id: number; label: string }[] {
  const seen = new Map<number, string>();
  for (const f of families) {
    if (!seen.has(f.product.productCategoryId)) {
      seen.set(f.product.productCategoryId, f.product.categoryLabel ?? 'Autre');
    }
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
