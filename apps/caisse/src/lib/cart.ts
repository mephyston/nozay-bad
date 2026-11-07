export interface CatalogItem {
  id: number;
  name: string;
  priceCents: number;
  active: boolean;
}

export type Cart = Map<number, number>;

/**
 * L'identifiant d'une vente ou d'un remboursement. `crypto.randomUUID` n'existe qu'en HTTPS ou
 * sur localhost : il ferait tomber la caisse ouverte depuis un téléphone sur le réseau local.
 */
export function newClientId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Un montant saisi en euros (« 12,50 »), en centimes. `null` s'il n'est pas lisible. */
export function parseEuros(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function itemsTotal(cart: Cart, items: CatalogItem[]): number {
  let total = 0;
  for (const [id, quantity] of cart) total += (items.find((i) => i.id === id)?.priceCents ?? 0) * quantity;
  return total;
}

/** La carte ne paie que les articles, jamais une recharge. */
export function splitPayment(itemsCents: number, rechargeCents: number, cardBalanceCents: number | null) {
  const prepaidCents = cardBalanceCents === null ? 0 : Math.min(cardBalanceCents, itemsCents);
  return { prepaidCents, cashCents: itemsCents + rechargeCents - prepaidCents };
}

export function changeDue(receivedCents: number | null, cashCents: number): number | null {
  if (receivedCents === null || receivedCents < cashCents) return null;
  return receivedCents - cashCents;
}

export async function callApi<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = (await res.json().catch(() => null)) as any;
  if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Le serveur ne répond pas.');
  return payload.data as T;
}
