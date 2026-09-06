import { describe, it, expect } from 'vitest';
import { accountActions, prefillAction, showsMemberAdvances } from './account-actions';

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant' },
  { id: 3, code: 'cash', label: 'Caisse' },
  { id: 4, code: 'badnet', label: 'Badnet' },
  { id: 5, code: 'member_advances', label: 'Avances' }
];
const CTX = { today: '2026-09-06', targetSeasonId: '7', accounts: ACCOUNTS };

describe('accountActions', () => {
  it('pré-câble les quatre gestes du porte-monnaie Badnet et les deux du compte d’attente', () => {
    const badnet = accountActions('badnet').map((a) => a.key);
    expect(badnet).toEqual(['member-received', 'member-refund', 'topup', 'withdraw', 'fee-in', 'fee-out']);
    expect(accountActions('member_advances').map((a) => a.key)).toEqual(['member-received', 'member-refund']);
    expect(showsMemberAdvances('badnet')).toBe(true);
    expect(showsMemberAdvances('cash')).toBe(false);
  });

  it("donne à un compte inconnu un catalogue générique, entrée, sortie et virements", () => {
    expect(accountActions('paypal').map((a) => a.key)).toEqual(['in', 'out', 'transfer-in', 'transfer-out']);
  });

  it("pré-remplit un virement reçu d'une adhérente : du compte d'attente vers le courant, hors résultat", () => {
    const values = prefillAction(accountActions('badnet')[0], CTX);
    expect(values).toMatchObject({
      showPanel: 'transfert',
      formAccountId: 'member_advances',
      destinationAccountId: 'current',
      paymentMethod: 'virement_interne',
      description: 'Reçu de ',
      date: '2026-09-06',
      targetSeasonId: '7'
    });
  });

  it('pré-remplit un remboursement depuis l’avance en attente choisie, montant et libellé compris', () => {
    const refund = accountActions('badnet').find((a) => a.key === 'member-refund')!;
    const values = prefillAction(refund, { ...CTX, pending: { description: 'Reçu de Mme Dupont', reference: 'VIR-77', amountCents: 2500 } });
    expect(values).toMatchObject({
      formAccountId: 'badnet',
      destinationAccountId: 'member_advances',
      amount: '25.00',
      description: 'Rendu à Mme Dupont',
      reference: 'VIR-77'
    });
  });

  it("propose un autre compte que le sien pour un virement « au choix »", () => {
    const values = prefillAction(accountActions('paypal').find((a) => a.key === 'transfer-out')!, CTX);
    expect(values.formAccountId).toBe('paypal');
    expect(values.destinationAccountId).toBe('current');
  });
});
