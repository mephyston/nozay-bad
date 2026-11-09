/**
 * Ce que le remboursement d'une carte rend sur les CB qui l'ont chargée : les recharges les
 * plus récentes d'abord, chacune pour sa part recharge, jusqu'à épuiser le solde. Le reste
 * sort en espèces.
 */
export interface RechargePayment {
  attemptId: number;
  foreignTxId: string;
  transactionCode: string | null;
  rechargeCents: number;
  cardCents: number;
}

export interface CardRefundPart extends RechargePayment {
  amountCents: number;
}

export function planCardRefund(balanceCents: number, payments: RechargePayment[]): CardRefundPart[] {
  const parts: CardRefundPart[] = [];
  let left = balanceCents;
  for (const payment of payments) {
    if (left <= 0) break;
    const amountCents = Math.min(left, payment.rechargeCents, payment.cardCents);
    if (amountCents <= 0) continue;
    parts.push({ ...payment, amountCents });
    left -= amountCents;
  }
  return parts;
}
