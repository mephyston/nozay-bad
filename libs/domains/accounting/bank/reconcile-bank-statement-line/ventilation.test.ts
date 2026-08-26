import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildReconciliationStatements } from './handler';
import { ReconcileBankStatementLineRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';

vi.mock('@nba/members-api', () => ({ isSeasonClosed: vi.fn() }));
vi.mock('./repository');
vi.mock('@nba/accounting-api', () => ({ normalizeCategory: vi.fn((c: any) => Number(c)) }));
vi.mock('../../config/queries', () => ({
  resolveAccountId: vi.fn().mockResolvedValue(1),
  resolvePaymentMethod: vi.fn().mockResolvedValue({ id: 1 })
}));
vi.mock('../../shared/accruals', () => ({ validateAccrualAndFiscalPhase: vi.fn() }));

const BANK_LINE = { id: 1, amount: 30000, amountCents: 30000, status: 'pending', date: '2026-02-16', name: 'VIR GROUPE' };

/** Les écritures réellement bâties : le mock rend les valeurs, pas un jeton opaque. */
let built: any[];

function mockRepo(over: Record<string, any> = {}) {
  built = [];
  const instance = {
    getBankStatementLineById: vi.fn().mockResolvedValue(BANK_LINE),
    getInvoiceById: vi.fn(async (_db: any, id: number) => ({ id, seasonId: 1, status: 'sent', totalAmountCents: 15000 })),
    getSeasonIdByDate: vi.fn().mockResolvedValue(1),
    resolveSeasonId: vi.fn(async (_db: any, s: any) => Number(s) || 1),
    getLedgerEntriesForBankStatementLine: vi.fn().mockResolvedValue([]),
    buildCreateLedgerEntryStatement: vi.fn((_db: any, values: any) => { built.push(values); return `entry-${built.length}`; }),
    buildMarkInvoiceAsPaidStatement: vi.fn((_db: any, invId: number) => `invoice-paid-${invId}`),
    buildMarkBankStatementLineReconciledStatement: vi.fn(() => 'line-reconciled'),
    ...over
  };
  (vi.mocked(ReconcileBankStatementLineRepository) as any).mockImplementation(function () { return instance; });
  return instance;
}

const part = (over: Record<string, any> = {}) => ({
  type: 'recette', accountId: 'current', category: '3', amount: 15000,
  date: '2026-02-16', paymentMethod: 'virement', description: 'Part', ...over
});

describe('ventilation : adhérent par part', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    (isSeasonClosed as any).mockResolvedValue(false);
  });

  /*
    `memberId` vivait hors de la boucle : les N écritures d'une ventilation recevaient toutes le
    même adhérent. Un virement groupé réglant deux cotisations était donc impossible à ventiler
    correctement — et rien ne le signalait.
  */
  it('rattache chaque part à son propre adhérent', async () => {
    mockRepo();

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ memberId: 42 }), part({ memberId: 99 })]
    });

    expect(built.map((e) => e.memberId)).toEqual([42, 99]);
  });

  it("retombe sur l'adhérent commun pour une part qui n'en désigne pas", async () => {
    mockRepo();

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      memberId: 7,
      transactions: [part(), part({ memberId: 99 })]
    });

    expect(built.map((e) => e.memberId)).toEqual([7, 99]);
  });

  it('conserve sa catégorie et son exercice à chaque part', async () => {
    mockRepo();

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ category: '3', seasonId: 1 }), part({ category: '9', seasonId: 2 })]
    });

    expect(built.map((e) => e.category)).toEqual([3, 9]);
    expect(built.map((e) => e.seasonId)).toEqual([1, 2]);
  });
});

describe('ventilation : facture par part', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    (isSeasonClosed as any).mockResolvedValue(false);
  });

  /*
    Sur plusieurs factures, une seule écriture était créée et seul `invoiceIds[0]` y était
    rattaché : les autres factures passaient `paid` sans qu'aucune écriture ne les porte.
  */
  it('rattache chaque part à sa facture, et les solde toutes', async () => {
    const repo = mockRepo();

    const { statements } = await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ invoiceId: 101 }), part({ invoiceId: 102 })]
    });

    expect(built.map((e) => e.invoiceId)).toEqual([101, 102]);
    expect(repo.buildMarkInvoiceAsPaidStatement).toHaveBeenCalledTimes(2);
    expect(statements).toContain('invoice-paid-101');
    expect(statements).toContain('invoice-paid-102');
  });

  it('contrôle chaque facture désignée par une part', async () => {
    mockRepo({
      getInvoiceById: vi.fn(async (_db: any, id: number) =>
        id === 102 ? { id, seasonId: 1, status: 'paid' } : { id, seasonId: 1, status: 'sent' })
    });

    const result = await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ invoiceId: 101 }), part({ invoiceId: 102 })]
    });

    expect(result.error).toBe('La facture a déjà été payée ou a été annulée.');
    expect(result.status).toBe(400);
  });

  it('refuse une part visant une facture introuvable', async () => {
    mockRepo({ getInvoiceById: vi.fn().mockResolvedValue(undefined) });

    const result = await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ invoiceId: 404 })]
    });

    expect(result.error).toBe('Facture introuvable');
    expect(result.status).toBe(404);
  });

  it('ne solde pas deux fois une facture désignée par le corps et par une part', async () => {
    const repo = mockRepo();

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      invoiceId: 101,
      transactions: [part({ invoiceId: 101 })]
    });

    expect(repo.buildMarkInvoiceAsPaidStatement).toHaveBeenCalledTimes(1);
  });

  it("laisse l'écriture unique porter la facture du corps", async () => {
    mockRepo();

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      invoiceId: 101,
      memberId: 5,
      transaction: part({ amount: 30000 })
    });

    expect(built).toHaveLength(1);
    expect(built[0]).toMatchObject({ invoiceId: 101, memberId: 5 });
  });
});

describe('bascule de la ligne de relevé', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    (isSeasonClosed as any).mockResolvedValue(false);
  });

  it('ne solde la ligne que lorsque le cumul des parts atteint son montant', async () => {
    const repo = mockRepo();

    const { statements } = await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ amount: 10000 })]
    });

    expect(repo.buildMarkBankStatementLineReconciledStatement).not.toHaveBeenCalled();
    expect(statements).not.toContain('line-reconciled');
  });

  it('solde la ligne quand les parts la couvrent entièrement', async () => {
    const repo = mockRepo();

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ amount: 15000 }), part({ amount: 15000 })]
    });

    expect(repo.buildMarkBankStatementLineReconciledStatement).toHaveBeenCalled();
  });

  /* Une ventilation peut se saisir en plusieurs fois : ce qui est déjà lié compte. */
  it("tient compte des écritures déjà rattachées", async () => {
    const repo = mockRepo({
      getLedgerEntriesForBankStatementLine: vi.fn().mockResolvedValue([{ amount: 20000 }])
    });

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ amount: 10000 })]
    });

    expect(repo.buildMarkBankStatementLineReconciledStatement).toHaveBeenCalled();
  });
});
