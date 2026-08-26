import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReconciliationStatement, getReconciliationStatements } from './handler';
import { GetReconciliationStatementRepository } from './repository';
import { getSeasonFromDb } from '../../shared/accruals';

vi.mock('./repository');
vi.mock('../../shared/accruals', () => ({ getSeasonFromDb: vi.fn() }));

const SEASON = { id: 1, code: '25-26', startDate: '2025-09-01', endDate: '2026-08-31' };
const ACCOUNT = { id: 1, code: 'current', label: 'Compte Courant' };

const entry = (over: Record<string, any> = {}) => ({
  id: 1,
  type: 'recette',
  accountId: 1,
  transferId: null,
  transferLeg: null,
  amountCents: 0,
  date: '2025-10-01',
  description: 'Écriture',
  status: 'cleared',
  bankStatementLineId: null,
  paymentMethodId: 1,
  ...over
});

const bankLine = (over: Record<string, any> = {}) => ({
  id: 1,
  date: '2025-10-01',
  name: 'Ligne',
  amountCents: 0,
  status: 'pending',
  ...over
});

function mockRepo(over: Record<string, any> = {}) {
  const instance = {
    getAccountByCode: vi.fn().mockResolvedValue(ACCOUNT),
    getInitialBalanceCents: vi.fn().mockResolvedValue(0),
    getEntriesForPeriod: vi.fn().mockResolvedValue([]),
    getUnreconciledBankLines: vi.fn().mockResolvedValue([]),
    getLatestBankStatementBalance: vi.fn().mockResolvedValue(undefined),
    getLatestBankStatementDate: vi.fn().mockResolvedValue(undefined),
    getAccountsWithStatements: vi.fn().mockResolvedValue([]),
    ...over
  };
  (vi.mocked(GetReconciliationStatementRepository) as any).mockImplementation(function () { return instance; });
  return instance;
}

describe('getReconciliationStatement', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    vi.mocked(getSeasonFromDb).mockResolvedValue(SEASON as any);
  });

  it('refuse un compte inconnu', async () => {
    mockRepo({ getAccountByCode: vi.fn().mockResolvedValue(undefined) });
    await expect(getReconciliationStatement(db, { accountCode: 'livret-b', seasonId: '25-26' }))
      .rejects.toThrow('introuvable');
  });

  it('refuse une saison inconnue', async () => {
    mockRepo();
    vi.mocked(getSeasonFromDb).mockResolvedValue(undefined as any);
    await expect(getReconciliationStatement(db, { accountCode: 'current', seasonId: '99-00' }))
      .rejects.toThrow('Saison introuvable');
  });

  /*
   * Le cas nominal du rapprochement : tout est pointé, le relevé confirme les livres.
   */
  it("boucle à zéro quand tout est pointé et que le relevé confirme", async () => {
    mockRepo({
      getInitialBalanceCents: vi.fn().mockResolvedValue(100_000),
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 1, type: 'recette', amountCents: 20_000, bankStatementLineId: 7 })
      ]),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2025-10-31', balanceCents: 120_000 })
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.book.grossCents).toBe(120_000);
    expect(result.expectedBankBalanceCents).toBe(120_000);
    expect(result.gapCents).toBe(0);
    expect(result.reconciled).toBe(true);
  });

  /*
   * Le cas qui motive tout : un chèque encaissé dans les livres et pas encore déposé. Le solde
   * comptable a bougé, le relevé n'a pas bougé, et l'écart doit rester nul — c'est le décalage
   * qui l'explique, pas une erreur.
   */
  it("explique par une écriture non pointée l'écart entre les livres et le relevé", async () => {
    mockRepo({
      getInitialBalanceCents: vi.fn().mockResolvedValue(100_000),
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 5, type: 'recette', amountCents: 8_000, status: 'in_vault', bankStatementLineId: null, description: 'Chèque Dupont' })
      ]),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2025-10-31', balanceCents: 100_000 })
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.book.grossCents).toBe(108_000);
    expect(result.unpointedEntriesTotalCents).toBe(8_000);
    expect(result.unpointedEntries).toHaveLength(1);
    expect(result.unpointedEntries[0]).toMatchObject({ id: 5, signedAmountCents: 8_000, status: 'in_vault' });
    expect(result.expectedBankBalanceCents).toBe(100_000);
    expect(result.gapCents).toBe(0);
  });

  it("explique par une ligne de relevé non comptabilisée l'écart inverse", async () => {
    mockRepo({
      getInitialBalanceCents: vi.fn().mockResolvedValue(100_000),
      getUnreconciledBankLines: vi.fn().mockResolvedValue([
        bankLine({ id: 3, amountCents: -4_500, name: 'Frais de tenue de compte' })
      ]),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2025-10-31', balanceCents: 95_500 })
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.unrecordedBankLinesTotalCents).toBe(-4_500);
    expect(result.expectedBankBalanceCents).toBe(95_500);
    expect(result.gapCents).toBe(0);
  });

  it("signale un écart que rien n'explique", async () => {
    mockRepo({
      getInitialBalanceCents: vi.fn().mockResolvedValue(100_000),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2025-10-31', balanceCents: 97_000 })
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.gapCents).toBe(-3_000);
    expect(result.reconciled).toBe(false);
  });

  /*
   * Une ligne masquée reste de l'argent que la banque a bougé. L'exclure du total ferait
   * apparaître un écart permanent, et masquer une ligne deviendrait un moyen de casser le
   * rapprochement sans s'en apercevoir.
   */
  it('compte les lignes masquées dans le total, et les isole', async () => {
    mockRepo({
      getUnreconciledBankLines: vi.fn().mockResolvedValue([
        bankLine({ id: 3, amountCents: -1_000, status: 'ignored' }),
        bankLine({ id: 4, amountCents: 2_500, status: 'pending' })
      ]),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2025-10-31', balanceCents: 1_500 })
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.unrecordedBankLinesTotalCents).toBe(1_500);
    expect(result.ignoredBankLinesTotalCents).toBe(-1_000);
    expect(result.gapCents).toBe(0);
  });

  it("ne retient d'un virement interne que la jambe posée sur le compte", async () => {
    /*
     * Les deux jambes sont chargées — la période l'exige — mais seule celle du compte courant
     * compte dans son état de rapprochement. Sous l'ancien modèle, l'unique écriture portait les
     * deux comptes et le calcul devait la démêler ; désormais chacune se suffit.
     */
    mockRepo({
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 9, type: 'transfert', accountId: 1, transferId: 4, transferLeg: 'source', amountCents: 30_000 }),
        entry({ id: 10, type: 'transfert', accountId: 2, transferId: 4, transferLeg: 'destination', amountCents: 30_000 })
      ])
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.unpointedEntries).toHaveLength(1);
    expect(result.unpointedEntriesTotalCents).toBe(-30_000);
  });

  it("signale un virement dont une seule jambe est pointée, et l'écart qu'il crée", async () => {
    /*
     * C'est l'anomalie que l'ancien modèle rendait **inévitable** : une écriture, un
     * `bank_statement_line_id`, deux lignes de relevé. Elle devient ici un oubli, et doit se voir
     * — une jambe pointée sort des « écritures non pointées » pendant que sa ligne de relevé
     * reste « non comptabilisée », ce qui creuse un écart que rien n'explique à l'écran.
     */
    mockRepo({
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 9, type: 'transfert', accountId: 1, transferId: 4, transferLeg: 'source', amountCents: 30_000, bankStatementLineId: 77 }),
        entry({ id: 10, type: 'transfert', accountId: 2, transferId: 4, transferLeg: 'destination', amountCents: 30_000 })
      ])
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.halfPointedTransferIds).toEqual([4]);
  });

  it("rend un écart nul et non trompeur tant qu'aucun relevé n'a été importé", async () => {
    mockRepo({ getInitialBalanceCents: vi.fn().mockResolvedValue(100_000) });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26' });

    expect(result.statement).toBeNull();
    expect(result.gapCents).toBeNull();
    expect(result.reconciled).toBe(false);
  });

  /*
   * Arrêter au 31 août un compte dont le dernier relevé s'arrête au 31 juillet ferait
   * apparaître comme « écart » un mois d'opérations que la banque n'a pas encore annoncées.
   */
  it("s'arrête par défaut à la date du dernier relevé importé", async () => {
    const repo = mockRepo({ getLatestBankStatementDate: vi.fn().mockResolvedValue('2026-07-31') });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26' });

    expect(result.asOfDate).toBe('2026-07-31');
    expect(repo.getEntriesForPeriod).toHaveBeenCalledWith(db, '2025-09-01', '2026-07-31');
  });

  it("retombe sur la fin d'exercice quand aucun relevé n'existe", async () => {
    mockRepo();
    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26' });
    expect(result.asOfDate).toBe('2026-08-31');
  });
});

describe('getReconciliationStatements', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    vi.mocked(getSeasonFromDb).mockResolvedValue(SEASON as any);
  });

  /*
   * Un compte sans relevé n'a pas de banque à qui se comparer : la caisse d'une buvette
   * afficherait un écart permanent égal à son solde.
   */
  it("n'établit un état que pour les comptes dont un relevé a été importé", async () => {
    const repo = mockRepo({
      getAccountsWithStatements: vi.fn().mockResolvedValue([
        { id: 1, code: 'current', label: 'Compte Courant' },
        { id: 2, code: 'savings', label: 'Compte Livret' }
      ]),
      getAccountByCode: vi.fn(async (_db: any, code: string) =>
        code === 'savings' ? { id: 2, code: 'savings', label: 'Compte Livret' } : ACCOUNT)
    });

    const results = await getReconciliationStatements(db, { seasonId: '25-26' });

    expect(results.map((r) => r.account.code)).toEqual(['current', 'savings']);
    expect(repo.getAccountsWithStatements).toHaveBeenCalled();
  });

  it("rend une liste vide quand aucun relevé n'a jamais été importé", async () => {
    mockRepo({ getAccountsWithStatements: vi.fn().mockResolvedValue([]) });
    expect(await getReconciliationStatements(db, { seasonId: '25-26' })).toEqual([]);
  });
});
