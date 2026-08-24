import { describe, it, expect } from 'vitest';
import {
  matchesAccount,
  signedEntryAmountCents,
  findInitialBalanceCents,
  computeAccountBalance,
  computeAccountBalances,
  sumAccountBalances,
  unpointedEntryTotalCents,
  type AccountRef,
  type TreasuryEntryLike
} from './balances';

const CURRENT: AccountRef = { id: 1, code: 'current', label: 'Compte Courant' };
const SAVINGS: AccountRef = { id: 2, code: 'savings', label: 'Compte Livret' };

const entry = (over: Partial<TreasuryEntryLike>): TreasuryEntryLike => ({
  type: 'recette',
  accountId: 1,
  destinationAccountId: null,
  amountCents: 0,
  status: 'cleared',
  bankStatementLineId: null,
  ...over
});

describe('matchesAccount', () => {
  it('reconnaît un compte par identifiant, par code, et par identifiant en texte', () => {
    expect(matchesAccount(1, CURRENT)).toBe(true);
    expect(matchesAccount('current', CURRENT)).toBe(true);
    expect(matchesAccount('1', CURRENT)).toBe(true);
  });

  it('ne rattache pas un code à un autre compte', () => {
    expect(matchesAccount('savings', CURRENT)).toBe(false);
    expect(matchesAccount(2, CURRENT)).toBe(false);
  });

  /*
   * `Number('current')` vaut NaN. Sans le garde-fou, un `Number(value) === account.id`
   * naïf resterait faux — mais `Number('')` vaut 0, et un compte d'identifiant 0
   * ramasserait toutes les chaînes vides.
   */
  it('ignore les valeurs vides et absentes', () => {
    expect(matchesAccount(null, CURRENT)).toBe(false);
    expect(matchesAccount(undefined, CURRENT)).toBe(false);
    expect(matchesAccount('', { id: 0, code: 'zero' })).toBe(false);
  });
});

describe('signedEntryAmountCents', () => {
  it('additionne une recette et retranche une dépense', () => {
    expect(signedEntryAmountCents(entry({ type: 'recette', amountCents: 5000 }), CURRENT)).toBe(5000);
    expect(signedEntryAmountCents(entry({ type: 'depense', amountCents: 5000 }), CURRENT)).toBe(-5000);
  });

  it('compte un transfert deux fois, en sens opposés', () => {
    const transfer = entry({ type: 'transfert', accountId: 1, destinationAccountId: 2, amountCents: 20000 });
    expect(signedEntryAmountCents(transfer, CURRENT)).toBe(-20000);
    expect(signedEntryAmountCents(transfer, SAVINGS)).toBe(20000);
  });

  it("ignore l'écriture d'un autre compte", () => {
    expect(signedEntryAmountCents(entry({ accountId: 2, amountCents: 5000 }), CURRENT)).toBe(0);
  });
});

describe('findInitialBalanceCents', () => {
  it('retrouve un à-nouveau sous les deux représentations', () => {
    expect(findInitialBalanceCents([{ accountId: 1, initialBalanceCents: 100 }], CURRENT)).toBe(100);
    expect(findInitialBalanceCents([{ accountId: 'current', initialBalanceCents: 200 }], CURRENT)).toBe(200);
  });

  it('vaut zéro en l’absence de ligne', () => {
    expect(findInitialBalanceCents([], CURRENT)).toBe(0);
  });
});

describe('computeAccountBalance', () => {
  it("part de l'à-nouveau et applique les écritures", () => {
    const balance = computeAccountBalance(CURRENT, 100_000, [
      entry({ type: 'recette', amountCents: 5_000 }),
      entry({ type: 'depense', amountCents: 2_000 })
    ]);
    expect(balance.grossCents).toBe(103_000);
    expect(balance.bankTheoreticalCents).toBe(103_000);
  });

  /*
   * Le cœur du sujet : une écriture qui n'a pas atteint la banque bouge le solde comptable
   * et ne doit pas bouger le solde bancaire.
   */
  it('retranche du théorique un chèque encaissé mais resté en coffre', () => {
    const balance = computeAccountBalance(CURRENT, 100_000, [
      entry({ type: 'recette', amountCents: 5_000, status: 'in_vault' })
    ]);
    expect(balance.grossCents).toBe(105_000);
    expect(balance.inVaultCents).toBe(5_000);
    expect(balance.bankTheoreticalCents).toBe(100_000);
  });

  it("rajoute au théorique une dépense que la banque n'a pas encore débitée", () => {
    const balance = computeAccountBalance(CURRENT, 100_000, [
      entry({ type: 'depense', amountCents: 3_000, status: 'pending_debit' })
    ]);
    expect(balance.grossCents).toBe(97_000);
    expect(balance.pendingDebitCents).toBe(3_000);
    expect(balance.bankTheoreticalCents).toBe(100_000);
  });

  it("n'applique aucune correction à un statut posé dans le mauvais sens", () => {
    const balance = computeAccountBalance(CURRENT, 100_000, [
      entry({ type: 'depense', amountCents: 3_000, status: 'in_vault' }),
      entry({ type: 'recette', amountCents: 4_000, status: 'pending_debit' })
    ]);
    expect(balance.inVaultCents).toBe(0);
    expect(balance.pendingDebitCents).toBe(0);
    expect(balance.bankTheoreticalCents).toBe(balance.grossCents);
  });

  it('ne compte la correction que sur le compte qui porte l’écriture', () => {
    const balance = computeAccountBalance(SAVINGS, 0, [
      entry({ accountId: 1, type: 'recette', amountCents: 5_000, status: 'in_vault' })
    ]);
    expect(balance.grossCents).toBe(0);
    expect(balance.inVaultCents).toBe(0);
  });
});

describe('computeAccountBalances / sumAccountBalances', () => {
  it('répartit un transfert entre les deux comptes sans créer ni détruire de trésorerie', () => {
    const balances = computeAccountBalances(
      [CURRENT, SAVINGS],
      [
        { accountId: 1, initialBalanceCents: 100_000 },
        { accountId: 2, initialBalanceCents: 50_000 }
      ],
      [entry({ type: 'transfert', accountId: 1, destinationAccountId: 2, amountCents: 30_000 })]
    );

    expect(balances.map((b) => b.grossCents)).toEqual([70_000, 80_000]);
    expect(sumAccountBalances(balances).grossCents).toBe(150_000);
  });

  it('agrège les corrections de tous les comptes', () => {
    const balances = computeAccountBalances(
      [CURRENT, SAVINGS],
      [],
      [
        entry({ accountId: 1, type: 'recette', amountCents: 5_000, status: 'in_vault' }),
        entry({ accountId: 2, type: 'depense', amountCents: 2_000, status: 'pending_debit' })
      ]
    );

    const totals = sumAccountBalances(balances);
    expect(totals.grossCents).toBe(3_000);
    expect(totals.inVaultCents).toBe(5_000);
    expect(totals.pendingDebitCents).toBe(2_000);
    expect(totals.bankTheoreticalCents).toBe(0);
  });
});

describe('unpointedEntryTotalCents', () => {
  it('ne retient que les écritures rattachées à aucune ligne de relevé', () => {
    const total = unpointedEntryTotalCents(
      [
        entry({ type: 'recette', amountCents: 5_000, bankStatementLineId: 42 }),
        entry({ type: 'recette', amountCents: 3_000, bankStatementLineId: null }),
        entry({ type: 'depense', amountCents: 1_000, bankStatementLineId: undefined })
      ],
      CURRENT
    );
    expect(total).toBe(2_000);
  });
});
