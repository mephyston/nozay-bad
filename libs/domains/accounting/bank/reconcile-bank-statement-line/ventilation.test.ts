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

const BANK_LINE = { id: 1, accountId: 1, amount: 30000, amountCents: 30000, status: 'pending', date: '2026-02-16', name: 'VIR GROUPE' };

/*
  Une écriture déjà rattachée, **dans la forme que le dépôt rend** — colonne `amountCents`, et non
  `amount`. Le mock rendait l'autre : le cumul valait `NaN` en production alors que ces tests
  passaient au vert, et une ligne partiellement pointée ne se soldait jamais.
*/
const LIEE = (amountCents: number, type = 'recette') => ({ id: 99, accountId: 1, type, amountCents });

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
      getLedgerEntriesForBankStatementLine: vi.fn().mockResolvedValue([LIEE(20000)])
    });

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ amount: 10000 })]
    });

    expect(repo.buildMarkBankStatementLineReconciledStatement).toHaveBeenCalled();
  });
});

/*
  Une ligne peut se pointer contre plusieurs écritures existantes.

  `match` ajoutait le montant de la **ligne bancaire** à la somme comparée, si bien que le premier
  pointage la marquait rapprochée quel qu'ait été le montant de l'écriture. Une ligne de 300 €
  pointée contre une écriture de 100 € se refermait sur 200 € manquants — et l'écran n'offrait
  donc jamais d'en pointer une seconde.
*/
describe('pointage de plusieurs écritures', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    (isSeasonClosed as any).mockResolvedValue(false);
  });

  it('laisse la ligne ouverte quand l\'écriture pointée ne la couvre pas', async () => {
    const repo = mockRepo({
      getTransactionById: vi.fn().mockResolvedValue({ id: 5, seasonId: 1, accountId: 1, type: 'recette', amountCents: 10000 }),
      buildLinkTransactionToBankStatement: vi.fn(() => 'link')
    });

    await buildReconciliationStatements(db, 1, { action: 'match', ledgerEntryId: 5 });

    expect(repo.buildMarkBankStatementLineReconciledStatement).not.toHaveBeenCalled();
  });

  it('solde la ligne au pointage qui la couvre enfin', async () => {
    const repo = mockRepo({
      getTransactionById: vi.fn().mockResolvedValue({ id: 6, seasonId: 1, accountId: 1, type: 'recette', amountCents: 10000 }),
      buildLinkTransactionToBankStatement: vi.fn(() => 'link'),
      // 20 000 déjà rattachés ; la ligne vaut 30 000.
      getLedgerEntriesForBankStatementLine: vi.fn().mockResolvedValue([LIEE(20000)])
    });

    await buildReconciliationStatements(db, 1, { action: 'match', ledgerEntryId: 6 });

    expect(repo.buildMarkBankStatementLineReconciledStatement).toHaveBeenCalled();
  });

  it("solde la ligne d'un seul pointage quand l'écriture la couvre entièrement", async () => {
    const repo = mockRepo({
      getTransactionById: vi.fn().mockResolvedValue({ id: 7, seasonId: 1, accountId: 1, type: 'recette', amountCents: 30000 }),
      buildLinkTransactionToBankStatement: vi.fn(() => 'link')
    });

    await buildReconciliationStatements(db, 1, { action: 'match', ledgerEntryId: 7 });

    expect(repo.buildMarkBankStatementLineReconciledStatement).toHaveBeenCalled();
  });
});

/*
  Le dépassement est refusé, et nommé.

  La bascule se décidait sur un `>=` : pointer une seconde fois le montant entier d'une ligne
  déjà couverte la soldait sans rien dire, et laissait deux écritures pour une seule opération.
  C'est ainsi que sont nés les doublons de GEN-2526-067 et GEN-2526-266B.
*/
describe('refus du dépassement', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    (isSeasonClosed as any).mockResolvedValue(false);
  });

  it('refuse un pointage qui dépasse le reste, en le nommant', async () => {
    const repo = mockRepo({
      getTransactionById: vi.fn().mockResolvedValue({ id: 8, seasonId: 1, accountId: 1, type: 'recette', amountCents: 30000 }),
      buildLinkTransactionToBankStatement: vi.fn(() => 'link'),
      // 20 000 déjà rattachés sur une ligne de 30 000 : il ne reste que 10 000.
      getLedgerEntriesForBankStatementLine: vi.fn().mockResolvedValue([LIEE(20000)])
    });

    const result = await buildReconciliationStatements(db, 1, { action: 'match', ledgerEntryId: 8 });

    expect(result.status).toBe(400);
    expect(result.error).toBe('Ce pointage de 300,00 € dépasse le reste à rapprocher sur cette ligne (100,00 €).');
    expect(result.statements).toEqual([]);
    expect(repo.buildMarkBankStatementLineReconciledStatement).not.toHaveBeenCalled();
  });

  it('refuse une ventilation dont le total dépasse la ligne', async () => {
    mockRepo();

    const result = await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ amount: 20000 }), part({ amount: 20000 })]
    });

    expect(result.status).toBe(400);
    expect(result.statements).toEqual([]);
  });

  /* Une écriture d'un autre compte ne pèse rien sur cette ligne : la pointer la condamnerait. */
  it("refuse de pointer une écriture d'un autre compte", async () => {
    mockRepo({
      getTransactionById: vi.fn().mockResolvedValue({ id: 9, seasonId: 1, accountId: 2, type: 'recette', amountCents: 30000 }),
      buildLinkTransactionToBankStatement: vi.fn(() => 'link')
    });

    const result = await buildReconciliationStatements(db, 1, { action: 'match', ledgerEntryId: 9 });

    expect(result.status).toBe(400);
    expect(result.error).toBe('Cette écriture appartient à un autre compte que la ligne de relevé.');
  });

  /*
    Le net de la requête, et non chaque part : une ventilation de sens mêlés — un salaire brut au
    débit, sa retenue au crédit — dépasse la ligne part par part et la couvre exactement au total.
  */
  it('solde une ventilation de sens mêlés sur son net', async () => {
    const repo = mockRepo({
      getBankStatementLineById: vi.fn().mockResolvedValue({ ...BANK_LINE, amount: -193993, amountCents: -193993 })
    });

    await buildReconciliationStatements(db, 1, {
      action: 'create',
      transactions: [part({ type: 'depense', amount: 200000 }), part({ type: 'recette', amount: 6007 })]
    });

    expect(repo.buildMarkBankStatementLineReconciledStatement).toHaveBeenCalled();
  });

  /*
    Les statements d'un lot ne sont exécutés qu'à la fin : sans mémoire partagée, deux requêtes
    visant la même ligne ne se verraient pas, et le refus se contournerait en groupant.
  */
  it('voit dans un même lot ce que la base ne montre pas encore', async () => {
    mockRepo();
    const enAttente = new Map();

    const premier = await buildReconciliationStatements(db, 1, { action: 'create', transactions: [part({ amount: 20000 })] }, enAttente);
    const second = await buildReconciliationStatements(db, 1, { action: 'create', transactions: [part({ amount: 20000 })] }, enAttente);

    expect(premier.error).toBeUndefined();
    expect(second.status).toBe(400);
  });
});
