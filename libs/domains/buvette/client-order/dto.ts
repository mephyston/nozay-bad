export interface CatalogForClient {
  /** Fermée, la buvette montre sa carte mais ne prend pas de commande. */
  open: boolean;
  items: { id: number; name: string; priceCents: number }[];
}

export interface ClientOrder {
  id: number;
  /** Ce que le client donne au comptoir. */
  number: number;
  createdAt: Date;
  totalCents: number;
  lines: { itemId: number; name: string; quantity: number; unitPriceCents: number }[];
}
