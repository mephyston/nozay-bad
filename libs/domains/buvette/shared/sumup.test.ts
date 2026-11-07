import { describe, expect, it } from 'vitest';
import { FOREIGN_TX_ID_PATTERN, newForeignTxId, readTransaction } from './sumup';

describe('lecture des transactions SumUp', () => {
  it('reconnaît un paiement réussi, déjà versé compris', () => {
    expect(readTransaction({ status: 'SUCCESSFUL', amount: 4.5, currency: 'EUR', transaction_code: 'T1' })).toEqual({
      status: 'successful', amountCents: 450, currency: 'EUR', transactionCode: 'T1'
    });
    expect(readTransaction({ status: 'X', simple_status: 'PAID_OUT' }).status).toBe('successful');
  });

  it('un montant décimal tombe juste au centime', () => {
    expect(readTransaction({ status: 'SUCCESSFUL', amount: 19.99 }).amountCents).toBe(1999);
  });

  it('une annulation, un refus ou un remboursement ne sont pas des paiements', () => {
    for (const status of ['FAILED', 'CANCELLED', 'REFUNDED']) expect(readTransaction({ status }).status).toBe('failed');
    expect(readTransaction({ status: 'PENDING' }).status).toBe('pending');
    expect(readTransaction({ status: 'NOUVEAU' }).status).toBe('pending');
    expect(readTransaction(null).status).toBe('pending');
  });

  it('chaque tentative a un identifiant propre, au format accepté', () => {
    expect(newForeignTxId()).toMatch(new RegExp(FOREIGN_TX_ID_PATTERN));
    expect(newForeignTxId()).not.toBe(newForeignTxId());
  });
});
