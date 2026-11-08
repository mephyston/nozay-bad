import { describe, expect, it } from 'vitest';
import { parseEuros, validateItem } from './catalog-actions';

describe('saisie du catalogue', () => {
  it('lit un prix à la française', () => {
    expect(parseEuros('2,50')).toBe(250);
    expect(parseEuros('3')).toBe(300);
    expect(parseEuros('2,505')).toBeNull();
  });

  it('exige un nom, un prix et une catégorie', () => {
    const valid = { name: 'Café', priceEuros: '1', accountingCategoryId: 6, active: true, icon: '' };
    expect(validateItem(valid)).toBeNull();
    expect(validateItem({ ...valid, name: ' ' })).toContain('nom');
    expect(validateItem({ ...valid, priceEuros: 'gratuit' })).toContain('prix');
    expect(validateItem({ ...valid, accountingCategoryId: 0 })).toContain('catégorie');
  });
});
