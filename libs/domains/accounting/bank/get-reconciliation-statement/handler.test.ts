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
    getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map(), provisional: false }),
    getEntriesForPeriod: vi.fn().mockResolvedValue([]),
    getUnpointedEntriesBefore: vi.fn().mockResolvedValue([]),
    getUnreconciledBankLines: vi.fn().mockResolvedValue([]),
    getLatestBankStatementBalance: vi.fn().mockResolvedValue(undefined),
    getLatestBankStatementDate: vi.fn().mockResolvedValue(undefined),
    getLatestBankLineDate: vi.fn().mockResolvedValue(undefined),
    getLatestBankLineDates: vi.fn().mockResolvedValue(new Map()),
    getAccountsWithStatements: vi.fn().mockResolvedValue([]),
    getUnreconciledBankLinesForAccounts: vi.fn().mockResolvedValue(new Map()),
    getLatestBankStatementDates: vi.fn().mockResolvedValue(new Map()),
    getBankStatementBalancesForAccounts: vi.fn().mockResolvedValue(new Map()),
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
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false }),
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
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false }),
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

  /*
   * Cas réel du 08/09/2026, 110,00 €. L'exercice précédent n'étant pas clôturé, l'à-nouveau
   * de 26-27 cumule par date depuis le dernier report figé — pointées ou non. Une recette
   * datée du 05/09/2025 (au lieu de 2026) y entrait, sans figurer parmi les non-pointées de
   * l'exercice, bornées à son ouverture. L'écran déclarait l'écart inexplicable. Le chèque de
   * fin août déposé en septembre produit la même chose, sans erreur de personne.
   */
  it("retranche une écriture non pointée d'avant l'ouverture comprise dans l'à-nouveau reconstitué", async () => {
    const repo = mockRepo({
      // 100 000 de report figé au 01/09/2025 + 11 000 non pointés datés d'avant l'ouverture.
      getOpeningBalances: vi.fn().mockResolvedValue({
        byAccountId: new Map([[1, 111_000]]), provisional: true, computedFrom: '2025-09-01'
      }),
      getUnpointedEntriesBefore: vi.fn().mockResolvedValue([
        entry({ id: 789, type: 'recette', amountCents: 11_000, date: '2025-09-05', description: 'Règlement par chèque n°1426684', status: 'in_vault' })
      ]),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2026-09-07', balanceCents: 100_000 })
    });
    vi.mocked(getSeasonFromDb).mockResolvedValue({ id: 2, code: '26-27', startDate: '2026-09-01', endDate: '2027-08-31' } as any);

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '26-27', date: '2026-09-07' });

    // Les mêmes bornes que l'à-nouveau : du point figé à l'ouverture, exclue.
    expect(repo.getUnpointedEntriesBefore).toHaveBeenCalledWith(db, [1], '2025-09-01', '2026-09-01');
    expect(result.book.grossCents).toBe(111_000);
    expect(result.unpointedEntriesTotalCents).toBe(11_000);
    expect(result.unpointedEntries).toEqual([
      expect.objectContaining({ id: 789, signedAmountCents: 11_000, beforeSeason: true })
    ]);
    expect(result.expectedBankBalanceCents).toBe(100_000);
    expect(result.gapCents).toBe(0);
  });

  it("ne cherche rien avant l'ouverture quand l'à-nouveau est figé : le report d'une clôture fait foi", async () => {
    const repo = mockRepo({
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false, computedFrom: null }),
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 5, type: 'recette', amountCents: 8_000, bankStatementLineId: null })
      ])
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(repo.getUnpointedEntriesBefore).not.toHaveBeenCalled();
    expect(result.unpointedEntries).toEqual([expect.objectContaining({ id: 5, beforeSeason: false })]);
  });

  it("explique par une ligne de relevé non comptabilisée l'écart inverse", async () => {
    mockRepo({
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false }),
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
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false }),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2025-10-31', balanceCents: 97_000 })
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.gapCents).toBe(-3_000);
    expect(result.reconciled).toBe(false);
    // Rien ne dit ici que l'arrêté devance son détail : l'écart reste inexpliqué.
    expect(result.statementAheadOfBankLines).toBe(false);
  });

  /*
   * Cas réel du 27/08/2026, 176,00 €. L'OFX porte le solde **comptable** de la banque, qui
   * compte déjà les opérations du dernier jour dont l'export ne détaille pas les `<STMTTRN>`.
   * Les livres suivent le détail, donc le solde *en valeur*. L'écart n'est l'anomalie de
   * personne et se résorbe au relevé suivant : il doit se distinguer d'un écart inexpliqué.
   */
  it("distingue l'arrêté en avance sur son propre détail d'un écart inexpliqué", async () => {
    mockRepo({
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false }),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2026-08-27', balanceCents: 117_600 }),
      getLatestBankLineDate: vi.fn().mockResolvedValue('2026-08-26')
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2026-08-27' });

    expect(result.gapCents).toBe(17_600);
    expect(result.reconciled).toBe(false);
    expect(result.lastBankLineDate).toBe('2026-08-26');
    expect(result.statementAheadOfBankLines).toBe(true);
  });

  /*
   * La comparaison se fait à la date de l'ARRÊTÉ, pas à la date de consultation : des lignes
   * postérieures à l'arrêté prouvent au contraire que le détail ne lui manque pas.
   */
  it("ne crie pas à l'avance quand le détail va au moins jusqu'à l'arrêté", async () => {
    mockRepo({
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false }),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2026-08-27', balanceCents: 117_600 }),
      getLatestBankLineDate: vi.fn().mockResolvedValue('2026-08-31')
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2026-08-27' });

    expect(result.statementAheadOfBankLines).toBe(false);
  });

  it("ne prétend rien quand le compte n'a ni arrêté ni ligne", async () => {
    mockRepo();

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26' });

    expect(result.lastBankLineDate).toBeNull();
    expect(result.statementAheadOfBankLines).toBe(false);
  });

  /*
   * Le total porte sur « pas rapprochée », et non sur « en attente ».
   *
   * La distinction a compté : tant que masquer une ligne existait, l'exclure du total aurait
   * fait de ce bouton un moyen de casser le rapprochement sans s'en apercevoir. Le masquage a
   * disparu, mais la règle reste — et elle protège encore la base d'avant la migration 0029,
   * qui peut porter des lignes `ignored` que plus aucun code ne produit.
   */
  it("compte toute ligne non rapprochée dans le total, quel que soit son état", async () => {
    mockRepo({
      getUnreconciledBankLines: vi.fn().mockResolvedValue([
        // État hérité, que plus rien n'écrit : il doit peser comme n'importe quel autre.
        bankLine({ id: 3, amountCents: -1_000, status: 'ignored' as any }),
        bankLine({ id: 4, amountCents: 2_500, status: 'pending' })
      ]),
      getLatestBankStatementBalance: vi.fn().mockResolvedValue({ date: '2025-10-31', balanceCents: 1_500 })
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.unrecordedBankLinesTotalCents).toBe(1_500);
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
      getAccountsWithStatements: vi.fn().mockResolvedValue([
        { id: 1, code: 'current', label: 'Compte Courant' },
        { id: 2, code: 'savings', label: 'Livret A' }
      ]),
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 9, type: 'transfert', accountId: 1, transferId: 4, transferLeg: 'source', amountCents: 30_000, bankStatementLineId: 77 }),
        entry({ id: 10, type: 'transfert', accountId: 2, transferId: 4, transferLeg: 'destination', amountCents: 30_000 })
      ])
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.halfPointedTransferIds).toEqual([4]);
  });

  it("ne signale pas un virement vers un compte sans relevé, dont la jambe ne peut être pointée", async () => {
    /*
     * Le porte-monnaie Badnet (comme la caisse) n'a pas de relevé : sa jambe restera toujours
     * sans ligne. Ce n'est pas un oubli de pointage, et le dire à chaque arrêté et à chaque
     * clôture aurait noyé les vrais.
     */
    mockRepo({
      getAccountsWithStatements: vi.fn().mockResolvedValue([{ id: 1, code: 'current', label: 'Compte Courant' }]),
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 11, type: 'transfert', accountId: 1, transferId: 5, transferLeg: 'source', amountCents: 10_000, bankStatementLineId: 78 }),
        entry({ id: 12, type: 'transfert', accountId: 4, transferId: 5, transferLeg: 'destination', amountCents: 10_000 })
      ])
    });

    const result = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '25-26', date: '2025-10-31' });

    expect(result.halfPointedTransferIds).toEqual([]);
  });

  it("rend un écart nul et non trompeur tant qu'aucun relevé n'a été importé", async () => {
    mockRepo({ getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 100_000]]), provisional: false }) });

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

  /*
   * Le cœur du dénouage : le grand livre se lit **une** fois, pas une fois par compte. Le test
   * porte sur le compte d'appels parce que c'est exactement ce qui régressait — le résultat,
   * lui, était déjà juste quand chaque compte relisait tout.
   */
  it('ne lit le grand livre et la saison qu\'une seule fois pour tous les comptes', async () => {
    const repo = mockRepo({
      getAccountsWithStatements: vi.fn().mockResolvedValue([
        { id: 1, code: 'current', label: 'Compte Courant' },
        { id: 2, code: 'savings', label: 'Compte Livret' },
        { id: 3, code: 'cash', label: 'Caisse' }
      ])
    });

    await getReconciliationStatements(db, { seasonId: '25-26' });

    expect(repo.getEntriesForPeriod).toHaveBeenCalledTimes(1);
    expect(getSeasonFromDb).toHaveBeenCalledTimes(1);
    expect(repo.getOpeningBalances).toHaveBeenCalledTimes(1);
    expect(repo.getUnreconciledBankLinesForAccounts).toHaveBeenCalledTimes(1);
    expect(repo.getBankStatementBalancesForAccounts).toHaveBeenCalledTimes(1);
    expect(repo.getLatestBankLineDates).toHaveBeenCalledTimes(1);

    // Les lectures par compte de l'ancienne boucle ne doivent plus servir du tout.
    expect(repo.getEntriesForPeriod).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything());
    expect(repo.getUnreconciledBankLines).not.toHaveBeenCalled();
    // La vue agrégée lit les soldes d'ouverture UNE fois pour tous les comptes, et non un
    // appel par compte : c'est tout l'objet de ce chemin-là.
    expect(repo.getOpeningBalances).toHaveBeenCalledTimes(1);
    expect(repo.getLatestBankStatementBalance).not.toHaveBeenCalled();
    expect(repo.getLatestBankStatementDate).not.toHaveBeenCalled();
    expect(repo.getLatestBankLineDate).not.toHaveBeenCalled();
  });

  /* Chaque compte reçoit SA dernière ligne : le courant peut devancer son détail sans que le
     livret, dont le relevé est complet, en hérite. */
  it("juge l'avance de l'arrêté compte par compte", async () => {
    mockRepo({
      getAccountsWithStatements: vi.fn().mockResolvedValue([
        { id: 1, code: 'current', label: 'Compte Courant' },
        { id: 2, code: 'savings', label: 'Compte Livret' }
      ]),
      getBankStatementBalancesForAccounts: vi.fn().mockResolvedValue(new Map([
        [1, [{ date: '2026-08-27', balanceCents: 117_600 }]],
        [2, [{ date: '2026-08-27', balanceCents: 100_000 }]]
      ])),
      getLatestBankLineDates: vi.fn().mockResolvedValue(new Map([
        [1, '2026-08-26'],
        [2, '2026-08-27']
      ]))
    });

    const results = await getReconciliationStatements(db, { seasonId: '25-26', date: '2026-08-27' });

    expect(results.map((r) => [r.account.code, r.statementAheadOfBankLines]))
      .toEqual([['current', true], ['savings', false]]);
  });

  /*
   * Chaque compte garde sa propre date d'arrêté — celle de son dernier relevé. La lecture
   * commune va jusqu'à la plus tardive ; le resserrement se fait ensuite compte par compte, et
   * ce qui déborde ne doit pas entrer dans le calcul.
   */
  it("resserre chaque compte sur sa propre date d'arrêté", async () => {
    const repo = mockRepo({
      getAccountsWithStatements: vi.fn().mockResolvedValue([
        { id: 1, code: 'current', label: 'Compte Courant' },
        { id: 2, code: 'savings', label: 'Compte Livret' }
      ]),
      getLatestBankStatementDates: vi.fn().mockResolvedValue(new Map([[1, '2025-10-31'], [2, '2025-12-31']])),
      getOpeningBalances: vi.fn().mockResolvedValue({ byAccountId: new Map([[1, 0], [2, 0]]), provisional: false }),
      getEntriesForPeriod: vi.fn().mockResolvedValue([
        entry({ id: 1, accountId: 1, type: 'recette', amountCents: 1000, date: '2025-10-01' }),
        // Postérieure à l'arrêté du compte courant : elle ne doit pas peser sur son état.
        entry({ id: 2, accountId: 1, type: 'recette', amountCents: 5000, date: '2025-12-01' })
      ]),
      getUnreconciledBankLinesForAccounts: vi.fn().mockResolvedValue(new Map([
        [1, [bankLine({ id: 10, date: '2025-10-05', amountCents: 300 }), bankLine({ id: 11, date: '2025-12-05', amountCents: 900 })]],
        [2, []]
      ])),
      getBankStatementBalancesForAccounts: vi.fn().mockResolvedValue(new Map([
        [1, [{ date: '2025-12-31', balanceCents: 99999 }, { date: '2025-10-31', balanceCents: 300 }]],
        [2, []]
      ]))
    });

    const [current, savings] = await getReconciliationStatements(db, { seasonId: '25-26' });

    // La lecture commune porte jusqu'à la plus tardive des deux dates.
    expect(repo.getEntriesForPeriod).toHaveBeenCalledWith(db, '2025-09-01', '2025-12-31');

    expect(current.asOfDate).toBe('2025-10-31');
    expect(current.book.grossCents).toBe(1000);
    expect(current.unpointedEntries.map((e) => e.id)).toEqual([1]);
    expect(current.unrecordedBankLines.map((l) => l.id)).toEqual([10]);
    // L'arrêté retenu est le dernier qui précède la date du compte, pas le plus récent connu.
    expect(current.statement).toEqual({ date: '2025-10-31', balanceCents: 300 });
    // 1000 de solde − 1000 non pointé + 300 non comptabilisé = 300, soit le solde du relevé.
    expect(current.expectedBankBalanceCents).toBe(300);
    expect(current.gapCents).toBe(0);
    expect(current.reconciled).toBe(true);

    expect(savings.asOfDate).toBe('2025-12-31');
    expect(savings.statement).toBeNull();
  });

  it("impose la date d'arrêté demandée à tous les comptes", async () => {
    const repo = mockRepo({
      getAccountsWithStatements: vi.fn().mockResolvedValue([{ id: 1, code: 'current', label: 'Compte Courant' }])
    });

    const [statement] = await getReconciliationStatements(db, { seasonId: '25-26', date: '2025-11-30' });

    expect(statement.asOfDate).toBe('2025-11-30');
    // Inutile d'aller chercher les derniers arrêtés : la date est imposée.
    expect(repo.getLatestBankStatementDates).not.toHaveBeenCalled();
  });

  it("refuse un exercice introuvable", async () => {
    mockRepo({
      getAccountsWithStatements: vi.fn().mockResolvedValue([{ id: 1, code: 'current', label: 'Compte Courant' }])
    });
    vi.mocked(getSeasonFromDb).mockResolvedValue(undefined as any);

    await expect(getReconciliationStatements(db, { seasonId: 'inconnue' })).rejects.toThrow('Saison introuvable.');
  });
});
