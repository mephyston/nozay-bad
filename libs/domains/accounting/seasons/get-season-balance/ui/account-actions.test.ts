import { describe, it, expect } from 'vitest';
import { accountActions, prefillAction, resolveAccountRef, resolvePaymentKind, showsMemberAdvances } from './account-actions';

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant', kind: 'bank' },
  { id: 3, code: 'buvette', label: 'Caisse buvette', kind: 'cash' },
  { id: 4, code: 'badnet', label: 'Badnet', kind: 'wallet' },
  { id: 5, code: 'member_advances', label: 'Avances', kind: 'third_party' }
];
const METHODS = [
  { code: 'vir', kind: 'transfer' },
  { code: 'esp', kind: 'cash' },
  { code: 'interne', kind: 'internal' }
];
const ctxFor = (code: string) => ({
  today: '2026-09-06',
  targetSeasonId: '7',
  self: ACCOUNTS.find((a) => a.code === code)!,
  accounts: ACCOUNTS,
  paymentMethods: METHODS
});

describe('accountActions', () => {
  it('pré-câble les gestes par nature de compte : porte-monnaie, caisse et compte d’attente', () => {
    expect(accountActions('wallet').map((a) => a.key)).toEqual(['member-received', 'member-refund', 'topup', 'withdraw', 'fee-in', 'fee-out']);
    expect(accountActions('cash').map((a) => a.key)).toEqual(['cash-in', 'cash-out', 'deposit']);
    expect(accountActions('third_party').map((a) => a.key)).toEqual(['member-received', 'member-refund']);
    expect(showsMemberAdvances('wallet')).toBe(true);
    expect(showsMemberAdvances('cash')).toBe(false);
  });

  it('donne à un compte bancaire — ou à une nature inconnue — entrée, sortie et virements', () => {
    expect(accountActions('bank').map((a) => a.key)).toEqual(['in', 'out', 'transfer-in', 'transfer-out']);
    expect(accountActions('paypal').map((a) => a.key)).toEqual(['in', 'out', 'transfer-in', 'transfer-out']);
  });

  it("pré-remplit un virement reçu d'une adhérente : du compte d'attente vers la banque, par le moyen interne", () => {
    const values = prefillAction(accountActions('wallet')[0], ctxFor('badnet'));
    expect(values).toMatchObject({
      showPanel: 'transfert',
      formAccountId: 'member_advances',
      destinationAccountId: 'current',
      paymentMethod: 'interne',
      description: 'Reçu de ',
      date: '2026-09-06',
      targetSeasonId: '7'
    });
  });

  it('pré-remplit un remboursement depuis l’avance en attente choisie, montant et libellé compris', () => {
    const refund = accountActions('wallet').find((a) => a.key === 'member-refund')!;
    const values = prefillAction(refund, { ...ctxFor('badnet'), pending: { description: 'Reçu de Mme Dupont', reference: 'VIR-77', amountCents: 2500 } });
    expect(values).toMatchObject({
      formAccountId: 'badnet',
      destinationAccountId: 'member_advances',
      amount: '25.00',
      description: 'Rendu à Mme Dupont',
      reference: 'VIR-77'
    });
  });

  it('les gestes de caisse retiennent le moyen « espèces » actif, quel que soit son code', () => {
    const values = prefillAction(accountActions('cash')[0], ctxFor('buvette'));
    expect(values).toMatchObject({ showPanel: 'recette', formAccountId: 'buvette', paymentMethod: 'esp' });
  });

  it("propose un autre compte que le sien pour un virement « au choix »", () => {
    const values = prefillAction(accountActions('bank').find((a) => a.key === 'transfer-out')!, ctxFor('current'));
    expect(values.formAccountId).toBe('current');
    expect(values.destinationAccountId).toBe('buvette');
  });

  it("retombe sur « au choix » quand le club n'a pas de compte de la nature demandée, sans inventer de code", () => {
    const ctx = { self: ACCOUNTS[2], accounts: ACCOUNTS.filter((a) => a.kind !== 'third_party') };
    expect(resolveAccountRef('*third_party', ctx, 'badnet')).toBe('current');
    expect(resolvePaymentKind('cash', [{ code: 'vir', kind: 'transfer' }])).toBe('vir');
    expect(resolvePaymentKind('cash', [])).toBe('');
  });
});
