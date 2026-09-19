/** Un produit tel que l'écran d'administration le lit, rendu par `GET /shop/products`. */
export interface Product {
  id: number;
  name: string;
  /** « Maillot du club — L » pour une déclinaison, le nom seul sinon. */
  displayName?: string;
  productCategoryId: number;
  categoryLabel?: string;
  priceCents: number;
  /** Alias historique de `priceCents`. */
  price?: number;
  stock: number;
  trackStock?: boolean;
  active: boolean;
  parentId?: number | null;
  variantLabel?: string | null;
  variantCount?: number;
  description?: string | null;
  imageKey?: string | null;
  /** Commandes qui référencent le produit : à zéro, il se supprime encore. */
  ordersCount?: number;
  createdAt?: string;
}

/** Une catégorie de produit du club, telle que « Configuration → Catégories » la règle. */
export interface ProductCategory {
  id: number;
  label: string;
  active?: boolean;
}

export function isVariant(product: Pick<Product, 'parentId'>): boolean {
  return product.parentId !== null && product.parentId !== undefined;
}

/** Le nom composé, même quand la ligne vient d'un état local sans `displayName`. */
export function productLabel(product: Pick<Product, 'name' | 'displayName' | 'variantLabel'>): string {
  if (product.displayName) return product.displayName;
  const label = product.variantLabel?.trim();
  return label ? `${product.name} — ${label}` : product.name;
}

/** Un produit se supprime tant que rien ne le référence : ni commande, ni déclinaison. */
export function canDelete(product: Pick<Product, 'ordersCount' | 'variantCount'>): boolean {
  return !(product.ordersCount ?? 0) && !(product.variantCount ?? 0);
}
