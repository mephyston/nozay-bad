import { describe, expect, it } from 'vitest';
import { summarizeSession } from './closing';

describe('ventilation de la clôture', () => {
  it('sépare les recharges des recettes', () => {
    const summary = summarizeSession([
      { prepaidCents: 0, cashCents: 2000, rechargeCents: 2000, lines: [] },
      { prepaidCents: 0, cashCents: 300, rechargeCents: 0, lines: [{ accountingCategoryId: 1, amountCents: 300 }] }
    ]);
    expect(summary.rechargeCashCents).toBe(2000);
    expect(summary.revenue).toEqual([{ categoryId: 1, cashCents: 300, prepaidCents: 0 }]);
  });

  it('impute la carte ligne après ligne, au centime près', () => {
    const summary = summarizeSession([
      {
        prepaidCents: 500,
        cashCents: 700,
        rechargeCents: 0,
        lines: [
          { accountingCategoryId: 1, amountCents: 400 },
          { accountingCategoryId: 2, amountCents: 800 }
        ]
      }
    ]);
    expect(summary.revenue).toEqual([
      { categoryId: 1, cashCents: 0, prepaidCents: 400 },
      { categoryId: 2, cashCents: 700, prepaidCents: 100 }
    ]);
    expect(summary.itemsCashCents).toBe(700);
    expect(summary.prepaidCents).toBe(500);
  });
});
