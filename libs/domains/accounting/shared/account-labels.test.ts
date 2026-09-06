import { describe, it, expect } from 'vitest';
import { accountLabelOf, findAccount, toAccountOptions } from './account-labels';

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant' },
  { id: 4, code: 'badnet', label: 'Porte-monnaie Badnet' },
  { code: 'nolabel', label: '' }
];

describe('account-labels', () => {
  it('retrouve un compte par son code ou par son identifiant, numérique ou textuel', () => {
    expect(findAccount(ACCOUNTS, 'badnet')?.id).toBe(4);
    expect(findAccount(ACCOUNTS, 4)?.code).toBe('badnet');
    expect(findAccount(ACCOUNTS, '4')?.code).toBe('badnet');
    expect(findAccount(ACCOUNTS, 'paypal')).toBeUndefined();
    expect(findAccount(ACCOUNTS, null)).toBeUndefined();
  });

  it("rend le libellé, retombe sur le code sans libellé, et sur la valeur pour l'inconnu", () => {
    expect(accountLabelOf(ACCOUNTS, 1)).toBe('Compte Courant');
    expect(accountLabelOf(ACCOUNTS, 'nolabel')).toBe('nolabel');
    expect(accountLabelOf(ACCOUNTS, 'paypal')).toBe('paypal');
    expect(accountLabelOf(ACCOUNTS, undefined)).toBe('?');
  });

  it('produit des options dont la valeur est le code', () => {
    expect(toAccountOptions(ACCOUNTS)).toEqual([
      { value: 'current', label: 'Compte Courant' },
      { value: 'badnet', label: 'Porte-monnaie Badnet' },
      { value: 'nolabel', label: 'nolabel' }
    ]);
  });
});
