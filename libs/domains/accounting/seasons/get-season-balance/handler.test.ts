
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeasonBalance } from './handler';
import { GetSeasonBalanceRepository } from './repository';
vi.mock('./repository');

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant', classCode: '512' },
  { id: 2, code: 'savings', label: 'Compte Livret', classCode: '517' },
  { id: 3, code: 'cash', label: 'Caisse', classCode: '530' }
];
const ADVANCES = { id: 5, code: 'member_advances', label: 'Fonds reçus pour le compte des adhérents', classCode: '467' };

function mockRepo(over: Record<string, any> = {}) {
  const instance = {
    getBalances: vi.fn().mockResolvedValue([]),
    getTreasuryAccounts: vi.fn().mockResolvedValue(ACCOUNTS),
    getTransactionsForPeriod: vi.fn().mockResolvedValue([]),
    ...over
  };
  (vi.mocked(GetSeasonBalanceRepository) as any).mockImplementation(function () { return instance; });
  return instance;
}

describe('getSeasonBalance', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully', async () => {
    const repo = mockRepo();
    await (getSeasonBalance as any)(db, '23-24');
    expect(repo.getTransactionsForPeriod).toHaveBeenCalled();
  });

  it('should throw error', async () => {
    mockRepo({ getBalances: vi.fn().mockRejectedValue(new Error('err')) });
    await expect((getSeasonBalance as any)(db, '23-24')).rejects.toThrow();
  });

  it("additionne l'à-nouveau et les écritures de tous les comptes de trésorerie", async () => {
    mockRepo({
      getBalances: vi.fn().mockResolvedValue([
        { accountId: 1, initialBalanceCents: 100_000 },
        { accountId: 3, initialBalanceCents: 5_000 }
      ]),
      getTransactionsForPeriod: vi.fn().mockResolvedValue([
        { type: 'recette', accountId: 1, amountCents: 20_000, status: 'cleared' },
        { type: 'depense', accountId: 3, amountCents: 1_000, status: 'cleared' }
      ])
    });

    const result = await getSeasonBalance(db, '23-24');
    expect(result.balance).toBe(124_000);
    expect(result.bankTheoreticalCents).toBe(124_000);
  });

  /*
   * Le solde comptable et le solde bancaire théorique divergent dès qu'une écriture n'a pas
   * atteint la banque. `balance` doit rester le comptable — c'est lui qui se reporte
   * à-nouveau — et la correction doit apparaître à côté, pas à sa place.
   */
  it('sépare le solde comptable du solde bancaire théorique', async () => {
    mockRepo({
      getBalances: vi.fn().mockResolvedValue([{ accountId: 1, initialBalanceCents: 100_000 }]),
      getTransactionsForPeriod: vi.fn().mockResolvedValue([
        { type: 'recette', accountId: 1, amountCents: 8_000, status: 'in_vault' },
        { type: 'depense', accountId: 1, amountCents: 3_000, status: 'pending_debit' }
      ])
    });

    const result = await getSeasonBalance(db, '23-24');
    expect(result.balance).toBe(105_000);
    expect(result.inVaultCents).toBe(8_000);
    expect(result.pendingDebitCents).toBe(3_000);
    expect(result.bankTheoreticalCents).toBe(100_000);
  });

  it('détaille le solde par compte', async () => {
    mockRepo({
      getBalances: vi.fn().mockResolvedValue([{ accountId: 2, initialBalanceCents: 50_000 }]),
      getTransactionsForPeriod: vi.fn().mockResolvedValue([])
    });

    const result = await getSeasonBalance(db, '23-24');
    expect(result.accounts.map((a) => [a.accountCode, a.grossCents])).toEqual([
      ['current', 0],
      ['savings', 50_000],
      ['cash', 0]
    ]);
  });

  it("laisse le compte d'attente des adhérents hors du solde, et rend la dette à part", async () => {
    /*
     * L'argent viré par une adhérente est sur le compte courant, mais il ne lui appartient plus
     * au club : le total ne doit ni le compter deux fois, ni le compenser avec le compte d'attente.
     */
    mockRepo({
      getTreasuryAccounts: vi.fn().mockResolvedValue([...ACCOUNTS, ADVANCES]),
      getBalances: vi.fn().mockResolvedValue([{ accountId: 1, initialBalanceCents: 100_000 }]),
      getTransactionsForPeriod: vi.fn().mockResolvedValue([
        { type: 'transfert', transferId: 9, transferLeg: 'source', accountId: 5, amountCents: 30_000, status: 'cleared', date: '2023-10-01' },
        { type: 'transfert', transferId: 9, transferLeg: 'destination', accountId: 1, amountCents: 30_000, status: 'cleared', date: '2023-10-01' }
      ])
    });

    const result = await getSeasonBalance(db, '23-24');
    expect(result.balance).toBe(130_000);
    expect(result.thirdPartyGrossCents).toBe(-30_000);
    expect(result.duesToThirdPartiesCents).toBe(30_000);
    expect(result.accounts.find((a) => a.accountCode === 'member_advances')).toMatchObject({ thirdParty: true, grossCents: -30_000 });
  });

  it('rejette un code de saison mal formé', async () => {
    mockRepo();
    await expect(getSeasonBalance(db, '2023')).rejects.toThrow('Format de saison invalide');
  });
});
