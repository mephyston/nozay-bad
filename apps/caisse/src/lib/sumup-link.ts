export interface SumUpLinkInput {
  affiliateKey: string;
  amountCents: number;
  foreignTxId: string;
  origin: string;
  isIos: boolean;
}

/**
 * Le lien qui ouvre l'application SumUp (Payment Switch). iOS et Android n'ont ni le même nom
 * de montant ni la même adresse de retour : la doc de SumUp les décrit séparément.
 */
export function sumUpLink({ affiliateKey, amountCents, foreignTxId, origin, isIos }: SumUpLinkInput): string {
  const amount = (amountCents / 100).toFixed(2);
  const back = `${origin}/retour`;
  const params: [string, string][] = [
    ['affiliate-key', affiliateKey],
    [isIos ? 'amount' : 'total', amount],
    ['currency', 'EUR'],
    ['title', 'Buvette'],
    ['foreign-tx-id', foreignTxId],
    ...(isIos ? ([['callbacksuccess', back], ['callbackfail', back]] as [string, string][]) : ([['callback', back]] as [string, string][]))
  ];
  return `sumupmerchant://pay/1.0?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

export function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
