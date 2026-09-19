export interface ListProductsInput { productCategoryId?: number; active?: boolean }

/** Un produit tel que les écrans le lisent : la ligne, plus ce qui se déduit d'elle. */
export interface ListedProduct {
  id: number;
  name: string;
  /** « Maillot du club — L » pour une déclinaison, le nom seul sinon. */
  displayName: string;
  productCategoryId: number;
  categoryLabel: string;
  priceCents: number;
  /** Alias historique de `priceCents`, que d'anciens écrans lisent encore. */
  price: number;
  stock: number;
  trackStock: boolean;
  active: boolean;
  parentId: number | null;
  variantLabel: string | null;
  /** Déclinaisons rattachées, actives ou non : un produit qui en a ne se commande pas lui-même. */
  variantCount: number;
  description: string | null;
  imageKey: string | null;
  ordersCount: number;
  createdAt: Date;
}

export type ListProductsOutput = ListedProduct[];
