/** Ce qu'une session a encaissé, ventilé pour la clôture. Calcul pur, sans base. */
export interface ClosingSale {
  prepaidCents: number;
  cashCents: number;
  cardCents: number;
  rechargeCents: number;
  lines: { accountingCategoryId: number; amountCents: number }[];
}

export interface RevenueByCategory {
  categoryId: number;
  cashCents: number;
  cardCents: number;
  prepaidCents: number;
}

export interface ClosingSummary {
  revenue: RevenueByCategory[];
  rechargeCashCents: number;
  rechargeCardCents: number;
  itemsCashCents: number;
  itemsCardCents: number;
  prepaidCents: number;
}

/**
 * La carte ne paie jamais une recharge : le complément, espèces ou CB, couvre d'abord la
 * recharge, puis ce que la carte laisse des articles. Dans une vente à plusieurs catégories, la carte s'impute
 * ligne après ligne : l'ordre est arbitraire, mais les totaux tombent juste au centime.
 */
export function summarizeSession(sales: ClosingSale[]): ClosingSummary {
  const byCategory = new Map<number, RevenueByCategory>();
  let rechargeCashCents = 0;
  let rechargeCardCents = 0;

  for (const sale of sales) {
    // Une vente a un seul complément à la carte buvette : espèces ou CB, jamais les deux.
    const byCard = sale.cardCents > 0;
    if (byCard) rechargeCardCents += sale.rechargeCents;
    else rechargeCashCents += sale.rechargeCents;
    let prepaidLeft = sale.prepaidCents;
    for (const line of sale.lines) {
      const prepaid = Math.min(prepaidLeft, line.amountCents);
      prepaidLeft -= prepaid;
      const entry = byCategory.get(line.accountingCategoryId) ?? {
        categoryId: line.accountingCategoryId,
        cashCents: 0,
        cardCents: 0,
        prepaidCents: 0
      };
      entry.prepaidCents += prepaid;
      if (byCard) entry.cardCents += line.amountCents - prepaid;
      else entry.cashCents += line.amountCents - prepaid;
      byCategory.set(line.accountingCategoryId, entry);
    }
  }

  const revenue = [...byCategory.values()].sort((a, b) => a.categoryId - b.categoryId);
  return {
    revenue,
    rechargeCashCents,
    rechargeCardCents,
    itemsCashCents: revenue.reduce((sum, r) => sum + r.cashCents, 0),
    itemsCardCents: revenue.reduce((sum, r) => sum + r.cardCents, 0),
    prepaidCents: revenue.reduce((sum, r) => sum + r.prepaidCents, 0)
  };
}
