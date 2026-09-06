import { describe, it, expect } from 'vitest';
import { pendingMemberAdvances } from './member-advances';
import type { AccountEntry } from './account-types';

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant' },
  { id: 4, code: 'badnet', label: 'Badnet' },
  { id: 5, code: 'member_advances', label: 'Avances' }
];

const leg = (over: Partial<AccountEntry>): AccountEntry => ({
  id: 0, type: 'transfert', accountId: 5, transferLeg: 'source', counterpartAccountId: 1,
  category: null, amount: 2500, date: '2026-09-01', paymentMethod: 'virement_interne',
  description: 'Reçu de Mme Dupont', reference: null, ...over
});

describe('pendingMemberAdvances', () => {
  it('liste les virements reçus que rien n’a encore rendus, avec leur ancienneté', () => {
    const { pending, totalCents } = pendingMemberAdvances(
      [
        leg({ id: 1, description: 'Reçu de Mme Dupont', date: '2026-09-01' }),
        leg({ id: 2, description: 'Reçu de M. Martin', amount: 4000, date: '2026-09-03' })
      ],
      ACCOUNTS,
      '2026-09-06'
    );
    expect(pending.map((p) => [p.id, p.ageDays])).toEqual([[1, 5], [2, 3]]);
    expect(totalCents).toBe(6500);
  });

  it('apparie un remboursement à son virement reçu par le libellé, puis par le montant seul', () => {
    const { pending } = pendingMemberAdvances(
      [
        leg({ id: 1, description: 'Reçu de Mme Dupont' }),
        leg({ id: 2, description: 'Reçu de M. Martin' }),
        leg({ id: 3, transferLeg: 'destination', counterpartAccountId: 4, description: 'Rendu à M. Martin', date: '2026-09-05' })
      ],
      ACCOUNTS,
      '2026-09-06'
    );
    expect(pending.map((p) => p.id)).toEqual([1]);

    const sansLibelle = pendingMemberAdvances(
      [
        leg({ id: 1, date: '2026-09-01' }),
        leg({ id: 2, date: '2026-09-02', description: 'Reçu de M. Martin' }),
        leg({ id: 3, transferLeg: 'destination', counterpartAccountId: 4, description: 'Badnet', date: '2026-09-05' })
      ],
      ACCOUNTS,
      '2026-09-06'
    );
    // Faute de libellé commun, le plus ancien du même montant est réputé rendu.
    expect(sansLibelle.pending.map((p) => p.id)).toEqual([2]);
  });

  it('préfère la référence quand les deux jambes en portent une', () => {
    const { pending } = pendingMemberAdvances(
      [
        leg({ id: 1, reference: 'A', description: 'Reçu de X' }),
        leg({ id: 2, reference: 'B', description: 'Reçu de X' }),
        leg({ id: 3, transferLeg: 'destination', counterpartAccountId: 4, reference: 'B', description: 'Rendu à X', date: '2026-09-05' })
      ],
      ACCOUNTS,
      '2026-09-06'
    );
    expect(pending.map((p) => p.id)).toEqual([1]);
  });

  it("ignore ce qui n'est pas un virement entre le courant, le compte d'attente et Badnet", () => {
    const { pending } = pendingMemberAdvances(
      [
        leg({ id: 1, type: 'recette', transferLeg: null, counterpartAccountId: null }),
        leg({ id: 2, counterpartAccountId: 4 }) // reçu depuis Badnet : pas une avance d'adhérente
      ],
      ACCOUNTS,
      '2026-09-06'
    );
    expect(pending).toEqual([]);
  });
});
