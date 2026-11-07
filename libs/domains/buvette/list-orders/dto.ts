export interface PendingOrder {
  id: number;
  createdAt: Date;
  /** Adresse masquée : de quoi vérifier avec le client, sans la dévoiler. */
  label: string;
  /** Ce que la carte peut payer maintenant. */
  availableCents: number;
  totalCents: number;
  lines: { name: string; quantity: number; unitPriceCents: number; available: boolean }[];
}
