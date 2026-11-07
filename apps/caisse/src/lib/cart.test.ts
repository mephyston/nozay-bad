import { describe, expect, it } from 'vitest';
import { changeDue, itemsTotal, newClientId, parseEuros, splitPayment } from './cart';

describe('panier de la caisse', () => {
  it('génère un identifiant accepté par l\'API, sans contexte sécurisé', () => {
    expect(newClientId()).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(newClientId()).not.toBe(newClientId());
  });

  it('additionne les articles', () => {
    const items = [{ id: 1, name: 'Café', priceCents: 100, active: true }, { id: 2, name: 'Sandwich', priceCents: 400, active: true }];
    expect(itemsTotal(new Map([[1, 3], [2, 1]]), items)).toBe(700);
  });

  it('la carte paie les articles et jamais la recharge', () => {
    expect(splitPayment(100, 2000, 1000)).toEqual({ prepaidCents: 100, cashCents: 2000 });
    expect(splitPayment(1200, 0, 800)).toEqual({ prepaidCents: 800, cashCents: 400 });
    expect(splitPayment(400, 0, null)).toEqual({ prepaidCents: 0, cashCents: 400 });
  });

  it('lit un montant saisi à la française', () => {
    expect(parseEuros('12,50')).toBe(1250);
    expect(parseEuros('3')).toBe(300);
    expect(parseEuros('1,234')).toBeNull();
    expect(parseEuros('abc')).toBeNull();
  });

  it('calcule la monnaie seulement si le reçu suffit', () => {
    expect(changeDue(2000, 1250)).toBe(750);
    expect(changeDue(1000, 1250)).toBeNull();
    expect(changeDue(null, 1250)).toBeNull();
  });
});
