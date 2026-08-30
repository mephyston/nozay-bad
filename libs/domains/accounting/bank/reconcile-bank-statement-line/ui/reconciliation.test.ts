import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReconciliationState, type BankStatementLine, type GLTransaction } from './reconciliation.svelte';

describe('createReconciliationState logic unit tests', () => {
  const originalFetch = globalThis.fetch;

  const mockBankTransactions: BankStatementLine[] = [
    {
      id: 1,
      fitid: 'FIT-1',
      accountId: 'current',
      amount: -5000,
      date: '2026-03-01',
      name: 'ACHAT MATERIEL BADMINTON',
      memo: 'Note de frais 123',
      status: 'pending',
      aiSuggestions: JSON.stringify({ category: 10, memberId: 42, confidence: 0.95 })
    },
    {
      id: 2,
      fitid: 'FIT-2',
      accountId: 'current',
      amount: 15000,
      date: '2026-03-02',
      name: 'VIREMENT ADHESION DUPONT',
      memo: 'Cotisation 2026',
      status: 'pending',
      aiSuggestions: null
    },
    {
      id: 3,
      fitid: 'FIT-3',
      accountId: 'current',
      amount: 2500,
      date: '2026-03-03',
      name: 'REMPLACEMENT CORDAGE',
      memo: 'Service',
      status: 'reconciled',
      aiSuggestions: null
    }
  ];

  const mockGlTransactions: GLTransaction[] = [
    {
      id: 10,
      type: 'depense',
      accountId: 'current',
      amount: -5000,
      date: '2026-03-01',
      description: 'Achat materiel',
      category: '10',
      bankStatementLineId: null
    },
    {
      id: 11,
      type: 'recette',
      accountId: 'current',
      amount: 15000,
      date: '2026-03-02',
      description: 'Adhesion Dupont',
      category: '1',
      bankStatementLineId: 99
    }
  ];

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  /*
    La file ne contient que ce qui reste à décider ; les archives vivent dans une vue à part.

    Les trois onglets mettaient sur le même plan une file à vider et deux historiques, et faisaient
    du statut consulté un filtre parmi d'autres.
  */
  it('ne met dans la file que les opérations en attente', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    expect(state.view).toBe('queue');
    expect(state.queueTransactions.map((t: any) => t.id)).toEqual([1, 2]);
    expect(state.displayedTransactions.map((t: any) => t.id)).toEqual([1, 2]);

    state.searchQuery = 'dupont';
    expect(state.displayedTransactions.map((t: any) => t.id)).toEqual([2]);
  });

  it("bascule sur l'historique sans toucher à la file", () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.view = 'history';
    state.activeTab = 'reconciled';
    expect(state.displayedTransactions.map((t: any) => t.id)).toEqual([3]);

    state.activeTab = 'ignored';
    expect(state.displayedTransactions).toEqual([]);

    // La file, elle, n'a pas bougé.
    expect(state.queueTransactions.map((t: any) => t.id)).toEqual([1, 2]);
  });

  it('calculates counts correctly by status', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    expect(state.pendingCount).toBe(2);
    expect(state.reconciledCount).toBe(1);
    expect(state.ignoredCount).toBe(0);
  });

  it('manages invoice selection and calculates selected sum', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.unpaidInvoices = [
      { id: 101, invoiceNumber: 'FAC-1', seasonId: '25-26', date: '2026-03-01', dueDate: '2026-04-01', clientName: 'A', clientAddress: null, clientEmail: null, subject: null, location: null, period: null, attendees: null, status: 'sent', totalAmount: 10000, createdAt: '2026-03-01' },
      { id: 102, invoiceNumber: 'FAC-2', seasonId: '25-26', date: '2026-03-01', dueDate: '2026-04-01', clientName: 'B', clientAddress: null, clientEmail: null, subject: null, location: null, period: null, attendees: null, status: 'sent', totalAmount: 5000, createdAt: '2026-03-01' }
    ];

    expect(state.selectedSum).toBe(0);
    state.toggleInvoiceSelection(101);
    expect(state.selectedSum).toBe(10000);
    state.toggleInvoiceSelection(102);
    expect(state.selectedSum).toBe(15000);
    state.toggleInvoiceSelection(101);
    expect(state.selectedSum).toBe(5000);
  });

  it('manages split rows', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    expect(state.splits.length).toBe(0);
    state.addSplitRow();
    state.addSplitRow();
    state.addSplitRow();
    expect(state.splits.length).toBe(3);

    state.removeSplitRow(0);
    expect(state.splits.length).toBe(2);

    // Won't remove if length <= 2
    state.removeSplitRow(0);
    expect(state.splits.length).toBe(2);
  });

  it('finds suggestions from GL excluding already linked transactions', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    // Transaction 1 (-5000, depense) matches GL entry 10 (-5000, depense, unlinked)
    const sug1 = state.getSuggestions(mockBankTransactions[0]);
    expect(sug1.length).toBe(1);
    expect(sug1[0].id).toBe(10);

    // Transaction 2 (15000, recette) matches GL entry 11 (15000, recette), but entry 11 has bankStatementLineId=99 so excluded
    const sug2 = state.getSuggestions(mockBankTransactions[1]);
    expect(sug2.length).toBe(0);
  });

  /*
    Le reste à rapprocher, dans la forme que le serveur envoie vraiment.

    Les écritures arrivent avec un montant **positif** — `amount_cents` est sous CHECK `> 0` — et
    c'est `type` qui porte le sens ; le compte, lui, est un identifiant entier. L'écran cumulait
    ici des valeurs absolues : sur une ligne mêlant les sens il annonçait un reste que le serveur
    n'aurait pas reconnu, et la comptable aurait reçu un refus sur un montant affiché comme dû.
  */
  describe('le reste à rapprocher', () => {
    const ligne = (over: any = {}) => ({
      id: 500, fitid: 'FIT-500', accountId: 1, amount: 15000, amountCents: 15000,
      date: '2026-03-01', name: 'VIR RECU GROUPE', memo: null, status: 'pending', aiSuggestions: null, ...over
    });
    const ecriture = (over: any = {}) => ({
      id: 600, type: 'recette', accountId: 1, amount: 10000, date: '2026-03-01',
      description: 'Part', category: '1', bankStatementLineId: 500, ...over
    });

    const etat = (lignes: any[], ecritures: any[]) => {
      const state = createReconciliationState({
        bankStatementLines: lignes as any,
        glTransactions: ecritures as any,
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: '2025-2026', active: true }],
        members: []
      });
      state.selectedTx = lignes[0];
      return state;
    };

    it('retranche ce qui est déjà pointé', () => {
      const state = etat([ligne()], [ecriture()]);
      expect(state.totalLinked).toBe(10000);
      expect(state.remainingAmount).toBe(5000);
    });

    it('tombe à zéro quand la ligne est exactement couverte', () => {
      const state = etat([ligne()], [ecriture(), ecriture({ id: 601, amount: 5000 })]);
      expect(state.remainingAmount).toBe(0);
    });

    /* Un salaire net : brut au débit, retenue au crédit, sur la même ligne de relevé. */
    it('compense les sens mêlés sur une ligne au débit', () => {
      const state = etat(
        [ligne({ amount: -193993, amountCents: -193993 })],
        [ecriture({ type: 'depense', amount: 200000 }), ecriture({ id: 601, type: 'recette', amount: 6007 })]
      );
      expect(state.remainingAmount).toBe(0);
    });

    /* Le compte se dit tantôt par son identifiant, tantôt par son code : les deux se reconnaissent. */
    it('reconnaît le compte désigné par son code', () => {
      const state = etat([ligne({ accountId: 'current' })], [ecriture({ accountId: 'current' })]);
      expect(state.remainingAmount).toBe(5000);
    });
  });

  it('loads unpaid invoices via fetch API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [
          { id: 201, invoiceNumber: 'FAC-201', seasonId: '25-26', status: 'sent', totalAmount: 12000 }
        ]
      })
    } as Response);

    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    await state.loadUnpaidInvoices();

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/accounting/reconciliation', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'get-unpaid-invoices', season: '25-26' })
    }));
    expect(state.unpaidInvoices.length).toBe(1);
    expect(state.unpaidInvoices[0].id).toBe(201);
  });

  /*
    Le rapprochement en lot a disparu avec la sélection multiple : il contredisait la règle posée
    pour cet écran — une ligne, une écriture validée. `validateSuggestion` reste le geste unitaire,
    et emprunte la même route serveur.
  */
  it('valide la suggestion d\'une seule ligne', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, lines: [], entries: [] })
    } as Response);

    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    await state.validateSuggestion(mockBankTransactions[0]);

    const body = vi.mocked(globalThis.fetch).mock.calls
      .map((call) => call?.[1]?.body as string | undefined)
      .filter((b): b is string => typeof b === 'string')
      .find((b) => b.includes('"action":"bulk"')) as string;
    expect(body).toContain('"btId":1');
  });

  /**
   * Le formulaire unitaire passait à `handleCreateAndMatch` l'identifiant de l'adhérent,
   * alors qu'il attend une ligne bancaire. Un nombre étant « truthy », il écrasait
   * silencieusement la sélection : la requête partait vers
   * `/bank-transactions/undefined/reconcile` et revenait en 400, sans que rien ne
   * désigne la vraie cause.
   */
  it('rapproche la ligne sélectionnée, sans argument à passer', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response);

    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.selectedTx = mockBankTransactions[1];
    state.amountToLink = 150;
    await state.handleCreateAndMatch();

    /* On cherche l'appel de rapprochement, et non le dernier : la relecture de l'état de
       rapprochement suit désormais chaque écriture. */
    const body = vi.mocked(globalThis.fetch).mock.calls
      .map((call) => call?.[1]?.body as string | undefined)
      .filter((b): b is string => typeof b === 'string')
      .find((b) => b.includes('"action":"create"')) as string;
    expect(body).toContain('"btId":2');
    expect(body).not.toContain('"btId":null');
  });

  it('refuse un argument qui n’est pas une ligne bancaire', async () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.selectedTx = mockBankTransactions[1];
    vi.mocked(globalThis.fetch).mockClear();

    // Un identifiant d'adhérent, tel que le formulaire l'envoyait par erreur.
    await (state.handleCreateAndMatch as (bt?: unknown) => Promise<void>)(42);

    // Rien ne part : mieux vaut un refus lisible qu'une URL malformée.
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(state.errorMsg).toContain('Aucune transaction bancaire');
  });

  describe('reprise de facture', () => {
    const invoice = (over: Record<string, any> = {}) => ({
      id: 101, invoiceNumber: 'FAC-2026-0001', seasonId: '25-26', date: '2026-02-15',
      dueDate: '2026-03-15', clientName: 'Mairie', clientAddress: null, clientEmail: null,
      subject: null, location: null, period: null, attendees: null, status: 'sent',
      totalAmount: 15000, createdAt: '2026-02-15', categoryBreakdown: [{ categoryId: 7, amountCents: 15000 }],
      ...over
    });

    function stateWithInvoices(invoices: any[]) {
      const state = createReconciliationState({
        bankStatementLines: mockBankTransactions,
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: '2025-2026', active: true }],
        members: []
      });
      state.unpaidInvoices = invoices;
      state.selectedTx = mockBankTransactions[1];
      return state;
    }

    /*
      Reprendre une facture remplit le formulaire ; l'ancienne version écrivait directement une
      recette avec `category: '1'` en dur, sans que personne n'ait pu la relire.
    */
    it("reprend l'imputation portée par la facture", () => {
      const state = stateWithInvoices([invoice()]);

      state.prefillFromInvoices([101]);

      expect(state.splits).toHaveLength(1);
      expect(state.splits[0]).toMatchObject({ category: '7', amount: 150, invoiceId: 101 });
      expect(state.splits[0].label).toContain('FAC-2026-0001');
      // Une part unique se saisit dans le formulaire simple.
      expect(state.isSplitMode).toBe(false);
      expect(state.category).toBe('7');
    });

    it('donne une part par facture, chacune portant la sienne', () => {
      const state = stateWithInvoices([
        invoice(),
        invoice({ id: 102, invoiceNumber: 'FAC-2026-0002', totalAmount: 5000, categoryBreakdown: [{ categoryId: 9, amountCents: 5000 }] })
      ]);

      state.prefillFromInvoices([101, 102]);

      expect(state.splits.map((r: any) => r.invoiceId)).toEqual([101, 102]);
      expect(state.splits.map((r: any) => r.category)).toEqual(['7', '9']);
      expect(state.isSplitMode).toBe(true);
    });

    it("ventile une facture qui mêle deux catégories", () => {
      const state = stateWithInvoices([
        invoice({ categoryBreakdown: [{ categoryId: 3, amountCents: 10000 }, { categoryId: 9, amountCents: 5000 }] })
      ]);

      state.prefillFromInvoices([101]);

      expect(state.splits).toHaveLength(2);
      expect(state.splits.map((r: any) => r.amount)).toEqual([100, 50]);
      // Les deux parts restent rattachées à la même facture.
      expect(state.splits.every((r: any) => r.invoiceId === 101)).toBe(true);
    });

    /* Une facture antérieure à la colonne n'a pas d'imputation : la comptable doit la choisir. */
    it("laisse la catégorie vide quand la facture n'en porte pas", () => {
      const state = stateWithInvoices([invoice({ categoryBreakdown: [] })]);

      state.prefillFromInvoices([101]);

      expect(state.splits).toHaveLength(1);
      expect(state.splits[0].category).toBe('');
      expect(state.splits[0].amount).toBe(150);
    });

    it("bascule sur l'onglet de saisie et n'écrit rien", () => {
      const state = stateWithInvoices([invoice()]);
      state.activeRightTab = 'ledger';

      state.prefillFromInvoices([101]);

      expect(state.activeRightTab).toBe('manual');
      expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalledWith(
        '/admin/api/accounting/reconciliation',
        expect.objectContaining({ body: expect.stringContaining('"action":"create"') })
      );
    });

    it('ignore une reprise qui ne désigne aucune facture connue', () => {
      const state = stateWithInvoices([invoice()]);
      state.splits = [];

      state.prefillFromInvoices([999]);

      expect(state.splits).toEqual([]);
    });
  });

  describe("garde-fou d'imputation", () => {
    function stateFor(over: Record<string, any> = {}) {
      const state = createReconciliationState({
        bankStatementLines: mockBankTransactions,
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: '2025-2026', active: true }],
        members: []
      });
      state.selectedTx = mockBankTransactions[1];
      for (const [k, v] of Object.entries(over)) (state as any)[k] = v;
      return state;
    }

    /*
      Sans ce refus, le serveur retomberait sur la catégorie 1 — « Adhésions & Inscriptions » —
      et l'on aurait déplacé le défaut codé en dur d'un cran plus bas au lieu de le supprimer.
    */
    it('refuse de ventiler une part sans imputation, et la nomme', async () => {
      const state = stateFor({
        isSplitMode: true,
        splits: [{ category: '7', amount: 100 }, { category: '', amount: 50 }]
      });

      await state.handleCreateAndMatch();

      expect(state.errorMsg).toContain('part 2');
      expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalledWith(
        '/admin/api/accounting/reconciliation',
        expect.objectContaining({ body: expect.stringContaining('"action":"create"') })
      );
    });

    it("refuse une écriture unique sans imputation", async () => {
      const state = stateFor({ category: '', amountToLink: 150 });

      await state.handleCreateAndMatch();

      expect(state.errorMsg).toContain('catégorie');
    });
  });

  describe('filtre par compte', () => {
    const lines = [
      { id: 1, fitid: 'F1', accountId: 1, amount: 100, date: '2026-03-01', name: 'COURANT UN', memo: null, status: 'pending', aiSuggestions: null },
      { id: 2, fitid: 'F2', accountId: 1, amount: 200, date: '2026-03-02', name: 'COURANT DEUX', memo: null, status: 'pending', aiSuggestions: null },
      { id: 3, fitid: 'F3', accountId: 2, amount: 300, date: '2026-03-03', name: 'LIVRET UN', memo: null, status: 'pending', aiSuggestions: null },
      { id: 4, fitid: 'F4', accountId: 2, amount: 400, date: '2026-03-04', name: 'LIVRET DEUX', memo: null, status: 'reconciled', aiSuggestions: null }
    ] as any[];

    const statements = [
      { account: { id: 1, code: 'current', label: 'Compte Courant' } },
      { account: { id: 2, code: 'savings', label: 'Livret A' } }
    ];

    const build = (over: Record<string, any> = {}) =>
      createReconciliationState({
        bankStatementLines: lines,
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: '2025-2026', active: true }],
        members: [],
        reconciliationStatements: statements,
        ...over
      } as any);

    /*
      Un rapprochement se pose compte par compte : ouvrir sur « tous » donnerait une file à
      laquelle aucun des états affichés au-dessus ne correspond.
    */
    it('ouvre sur le compte qui a le plus à traiter', () => {
      const state = build();

      expect(state.accountFilter).toBe('1');
      expect(state.queueTransactions.map((t: any) => t.id)).toEqual([1, 2]);
    });

    it("ouvre sur le seul compte d'un relevé mono-compte", () => {
      const state = build({ bankStatementLines: lines.filter((l) => l.accountId === 2) });

      expect(state.accountFilter).toBe('2');
    });

    it("ne choisit aucun compte quand le relevé est vide", () => {
      const state = build({ bankStatementLines: [] });

      expect(state.accountFilter).toBe('');
    });

    it('compte ce qui reste à traiter par compte', () => {
      const state = build();

      expect(state.accountOptions).toEqual([
        { id: '1', label: 'Compte Courant', pendingCount: 2 },
        { id: '2', label: 'Livret A', pendingCount: 1 }
      ]);
      expect(state.isSingleAccount).toBe(false);
    });

    it('restreint la file au compte choisi', () => {
      const state = build();

      state.accountFilter = '2';
      expect(state.queueTransactions.map((t: any) => t.id)).toEqual([3]);

      state.accountFilter = '';
      expect(state.queueTransactions.map((t: any) => t.id)).toEqual([1, 2, 3]);
    });

    it("restreint aussi l'historique", () => {
      const state = build();
      state.view = 'history';
      state.activeTab = 'reconciled';

      state.accountFilter = '1';
      expect(state.displayedTransactions).toEqual([]);

      state.accountFilter = '2';
      expect(state.displayedTransactions.map((t: any) => t.id)).toEqual([4]);
    });

    /* Un compte sans relevé arrêté n'a pas d'état : sa ligne ne doit pas disparaître du filtre. */
    it('garde un compte que les états ne nomment pas', () => {
      const state = build({ reconciliationStatements: [] });

      expect(state.accountOptions.map((a: any) => a.label)).toEqual(['Compte #1', 'Compte #2']);
    });

    it("ne voit qu'un compte sur un relevé mono-compte", () => {
      const state = build({ bankStatementLines: lines.filter((l) => l.accountId === 1) });

      expect(state.isSingleAccount).toBe(true);
    });
  });

  describe('exercices clos', () => {
    const entry = (over: Record<string, any> = {}) => ({
      id: 900, type: 'recette', accountId: 1, amount: 15000, date: '2026-03-02',
      description: 'Écriture', bankStatementLineId: null, seasonId: 1, ...over
    }) as any;

    const build = (glTransactions: any[]) =>
      createReconciliationState({
        bankStatementLines: mockBankTransactions,
        glTransactions,
        seasonId: '25-26',
        seasons: [
          { id: '1', code: '25-26', name: '2025-2026', active: true },
          { id: '2', code: '24-25', name: '2024-2025', active: false, closed: true }
        ],
        members: []
      } as any);

    /*
      Le serveur refuse d'associer une écriture dont l'exercice est arrêté, et a raison. L'écran la
      proposait quand même : le refus n'arrivait qu'après le clic.
    */
    it("écarte les écritures d'un exercice arrêté", () => {
      const state = build([entry({ id: 900, seasonId: 1 }), entry({ id: 901, seasonId: 2 })]);

      expect(state.pointableEntries.map((e: any) => e.id)).toEqual([900]);
    });

    it("ne les propose pas non plus comme correspondance", () => {
      const state = build([entry({ id: 901, seasonId: 2 })]);
      state.selectedTx = mockBankTransactions[1];

      expect(state.suggestions).toEqual([]);
    });

    it('reconnaît un exercice arrêté à son code comme à son identifiant', () => {
      const state = build([entry({ id: 901, seasonId: '24-25' })]);

      expect(state.pointableEntries).toEqual([]);
    });

    it('écarte aussi les écritures déjà pointées', () => {
      const state = build([entry({ id: 900, bankStatementLineId: 42 })]);

      expect(state.pointableEntries).toEqual([]);
    });
  });
});
