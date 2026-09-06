import { describe, it, expect } from 'vitest';
import {
  matchesAccount,
  signedEntryAmountCents,
  findInitialBalanceCents,
  computeAccountBalance,
  computeAccountBalances,
  sumAccountBalances,
  duesToThirdPartiesCents,
  isThirdPartyClassCode,
  unpointedEntryTotalCents,
  computeTransitCents,
  findHalfPointedTransferIds,
  type AccountRef,
  type TreasuryEntryLike
} from './balances';

const CURRENT: AccountRef = { id: 1, code: 'current', label: 'Compte Courant' };
const SAVINGS: AccountRef = { id: 2, code: 'savings', label: 'Compte Livret' };

const entry = (over: Partial<TreasuryEntryLike>): TreasuryEntryLike => ({
  type: 'recette',
  accountId: 1,
  amountCents: 0,
  status: 'cleared',
  bankStatementLineId: null,
  transferId: null,
  transferLeg: null,
  date: '2026-01-01',
  ...over
});

/** Les deux jambes d'un même virement, telles que `create-internal-transfer` les écrit. */
const transferLegs = (over: {
  transferId?: number; amountCents: number; sourceAccountId?: number; destinationAccountId?: number;
  sourceDate?: string; destinationDate?: string;
}): TreasuryEntryLike[] => [
  entry({
    type: 'transfert', transferId: over.transferId ?? 1, transferLeg: 'source',
    accountId: over.sourceAccountId ?? 1, amountCents: over.amountCents,
    date: over.sourceDate ?? '2026-01-01'
  }),
  entry({
    type: 'transfert', transferId: over.transferId ?? 1, transferLeg: 'destination',
    accountId: over.destinationAccountId ?? 2, amountCents: over.amountCents,
    date: over.destinationDate ?? over.sourceDate ?? '2026-01-01'
  })
];

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

  it('signe chaque jambe de virement selon son côté, et seulement sur son compte', () => {
    const [source, destination] = transferLegs({ amountCents: 20000 });

    expect(signedEntryAmountCents(source, CURRENT)).toBe(-20000);
    expect(signedEntryAmountCents(destination, SAVINGS)).toBe(20000);

    // Une jambe ne touche que le compte qu'elle nomme : c'est ce qui rend le pointage possible.
    expect(signedEntryAmountCents(source, SAVINGS)).toBe(0);
    expect(signedEntryAmountCents(destination, CURRENT)).toBe(0);
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
      transferLegs({ amountCents: 30_000 })
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
    expect(totals.thirdPartyGrossCents).toBe(0);
  });

  it("tient un compte de tiers hors des totaux, et rend sa dette à part", () => {
    /*
     * Le compte d'attente des adhérents (classe 4) reçoit ce qu'une adhérente vire au club
     * avant que le club le lui rende sur Badnet. Son solde négatif n'est pas de l'argent en
     * moins : c'est une dette. Le total de trésorerie disponible ne doit ni le compter, ni
     * le compenser avec le compte courant qui a reçu l'argent.
     */
    const ADVANCES = { id: 5, code: 'member_advances', label: 'Fonds reçus pour le compte des adhérents', classCode: '467' };
    const balances = computeAccountBalances(
      [{ ...CURRENT, classCode: '512' }, ADVANCES],
      [{ accountId: 1, initialBalanceCents: 100_000 }],
      transferLegs({ amountCents: 30_000, sourceAccountId: 5, destinationAccountId: 1 })
    );

    expect(balances.map((b) => [b.accountCode, b.thirdParty, b.grossCents])).toEqual([
      ['current', false, 130_000],
      ['member_advances', true, -30_000]
    ]);
    const totals = sumAccountBalances(balances);
    expect(totals.grossCents).toBe(130_000);
    expect(totals.bankTheoreticalCents).toBe(130_000);
    expect(totals.thirdPartyGrossCents).toBe(-30_000);
    expect(duesToThirdPartiesCents(totals)).toBe(30_000);
    // Une avance consentie (solde positif) n'est pas une dette.
    expect(duesToThirdPartiesCents({ thirdPartyGrossCents: 1_000 })).toBe(0);
  });

  it('reconnaît un compte de tiers à sa classe 4, et rien d\'autre', () => {
    expect(isThirdPartyClassCode('467')).toBe(true);
    expect(isThirdPartyClassCode('4091')).toBe(true);
    expect(isThirdPartyClassCode('517')).toBe(false);
    expect(isThirdPartyClassCode(undefined)).toBe(false);
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

describe('computeTransitCents', () => {
  it("compte l'argent parti d'un compte et pas encore arrivé dans l'autre", () => {
    // Sorti de la caisse le 12, crédité en banque le 15 : entre les deux, il n'est nulle part.
    const legs = transferLegs({ amountCents: 40_000, sourceDate: '2026-03-12', destinationDate: '2026-03-15' });

    expect(computeTransitCents(legs, '2026-03-11')).toBe(0);
    expect(computeTransitCents(legs, '2026-03-12')).toBe(40_000);
    expect(computeTransitCents(legs, '2026-03-14')).toBe(40_000);
    expect(computeTransitCents(legs, '2026-03-15')).toBe(0);
  });

  it('ignore un virement dont les deux jambes portent la même date', () => {
    expect(computeTransitCents(transferLegs({ amountCents: 40_000, sourceDate: '2026-03-12' }), '2026-03-12')).toBe(0);
  });

  it("ignore un virement à jambe unique, qui est une anomalie et non de l'argent en route", () => {
    const [source] = transferLegs({ amountCents: 40_000, sourceDate: '2026-03-12' });
    expect(computeTransitCents([source], '2026-03-13')).toBe(0);
  });

  it('additionne plusieurs virements en cours de route', () => {
    const legs = [
      ...transferLegs({ transferId: 1, amountCents: 40_000, sourceDate: '2026-03-12', destinationDate: '2026-03-15' }),
      ...transferLegs({ transferId: 2, amountCents: 10_000, sourceDate: '2026-03-13', destinationDate: '2026-03-16' })
    ];
    expect(computeTransitCents(legs, '2026-03-13')).toBe(50_000);
  });
});

describe('findHalfPointedTransferIds', () => {
  it('signale un virement dont une seule jambe est pointée', () => {
    const [source, destination] = transferLegs({ amountCents: 30_000 });
    expect(findHalfPointedTransferIds([{ ...source, bankStatementLineId: 7 }, destination])).toEqual([1]);
  });

  it('ne signale rien quand les deux jambes sont pointées, ni quand aucune ne l\'est', () => {
    const [source, destination] = transferLegs({ amountCents: 30_000 });
    expect(findHalfPointedTransferIds([
      { ...source, bankStatementLineId: 7 },
      { ...destination, bankStatementLineId: 8 }
    ])).toEqual([]);
    expect(findHalfPointedTransferIds([source, destination])).toEqual([]);
  });
});
