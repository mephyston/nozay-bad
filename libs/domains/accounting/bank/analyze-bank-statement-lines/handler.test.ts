import { seasonsTable } from '@nba/accounting/schema';
import { categoriesTable } from '@nba/accounting/schema';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { analyzeBankStatementLines } from './handler';
import { AnalyzeBankStatementLinesRepository } from './repository';
import { bankStatementLinesTable } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

describe('analyzeBankStatementLines', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    const existingSeasons = await db.select().from(seasonsTable).all();
    if (!existingSeasons.some((s: any) => s.code === '25-26')) {
      await db.insert(seasonsTable).values({
        code: '25-26',
        name: 'Saison 25-26',
        startDate: '2025-09-01',
        endDate: '2026-08-31',
        active: true,
        closedAt: null,
        createdAt: new Date()
      }).run();
    }

    // Le test vérifie la nomenclature exacte envoyée au prompt : on repart d'une base
    // vide plutôt que de cohabiter avec le seed de référence (dont plusieurs libellés
    // sont identiques, et `admin_label` est désormais unique).
    await db.run(sql`DELETE FROM product_categories`);
    await db.run(sql`DELETE FROM categories`);

    const existingCats = await db.select().from(categoriesTable).all();
    if (!existingCats.some((c: any) => c.id === 101)) {
      await db.insert(categoriesTable).values([
        { id: 101, adminLabel: 'Adhésions & Inscriptions', adherentLabel: 'Adhésions', hideInExpenses: false, createdAt: new Date() },
        { id: 102, adminLabel: 'Sponsoring', adherentLabel: 'Partenariat', hideInExpenses: false, createdAt: new Date() },
        { id: 103, adminLabel: 'Subventions', adherentLabel: 'Subventions', hideInExpenses: false, createdAt: new Date() },
        { id: 104, adminLabel: 'Actions Jeunes', adherentLabel: 'Activités Jeunes', hideInExpenses: false, createdAt: new Date() },
        { id: 105, adminLabel: 'Tournois Senior', adherentLabel: 'Tournois', hideInExpenses: false, createdAt: new Date() },
        { id: 106, adminLabel: 'Evénements & Buvettes', adherentLabel: 'Buvette', hideInExpenses: false, createdAt: new Date() },
        { id: 107, adminLabel: 'Cordage (vente aux adhérents)', adherentLabel: 'Cordages', hideInExpenses: false, createdAt: new Date() },
        { id: 108, adminLabel: 'Volants (vente ou achat)', adherentLabel: 'Volants', hideInExpenses: false, createdAt: new Date() },
        { id: 109, adminLabel: 'Salaires et Charges', adherentLabel: 'Salaires', hideInExpenses: true, createdAt: new Date() },
        { id: 110, adminLabel: 'Matériel (hors cordages)', adherentLabel: 'Matériel', hideInExpenses: false, createdAt: new Date() },
        { id: 111, adminLabel: 'Licences (versements fédération)', adherentLabel: 'Licences', hideInExpenses: true, createdAt: new Date() },
        { id: 112, adminLabel: 'Championnats (frais équipes)', adherentLabel: 'Championnats', hideInExpenses: false, createdAt: new Date() },
        { id: 113, adminLabel: 'Stages & Formations', adherentLabel: 'Formations', hideInExpenses: false, createdAt: new Date() },
        { id: 114, adminLabel: 'Frais de fonctionnement & administratif', adherentLabel: 'Fonctionnement', hideInExpenses: false, createdAt: new Date() },
        { id: 115, adminLabel: 'Virements Internes (Transit)', adherentLabel: 'Virements Internes', hideInExpenses: true, createdAt: new Date() }
      ]).run();
    }
  });

  it('should load categories dynamically from db and analyze pending bank transactions', async () => {
    await db.insert(bankStatementLinesTable).values({
      id: 1,
      fitid: 'TX1001',
      accountId: 1,
      amountCents: 15000,
      date: '2026-07-22',
      name: 'Adhesion Dupont Marc',
      memo: 'Cotisation 25-26',
      status: 'pending',
      createdAt: new Date()
    }).run();

    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([
      {
        id: 1,
        licence: '123456',
        seasonId: 1,
        lastName: 'Dupont',
        firstName: 'Marc',
        gender: 'M',
        birthDate: '1990-01-01',
        type: 'Adulte',
        importedAt: new Date(),
        amountDue: 15000,
        amountReceived: 0,
        amountRemaining: 15000,
        amountDueCents: 15000,
        amountReceivedCents: 0,
        amountRemainingCents: 15000,
        parent1Name: null,
        parent2Name: null
      }
    ]);

    let capturedPrompt = '';
    const aiMock = {
      run: vi.fn().mockImplementation(async (_model, payload) => {
        capturedPrompt = payload.messages[0].content;
        return {
          response: JSON.stringify({
            memberId: null,
            memberName: null,
            category: 101,
            confidence: 0.95,
            reasoning: 'Matches Adhésion'
          })
        };
      })
    };

    const result = await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });
    expect(result.count).toBe(1);

    expect(capturedPrompt).toContain('- ID: 101 (Adhésions & Inscriptions / Adhésions)');
    expect(capturedPrompt).toContain('- ID: 115 (Virements Internes (Transit) / Virements Internes)');

    const updatedTx = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 1)).all();
    const suggestions = JSON.parse(updatedTx[0].aiSuggestions);
    expect(suggestions.category).toBe(101);
  });

  it("flags a membership paid for next season as a produit constaté d'avance", async () => {
    await db.insert(bankStatementLinesTable).values({
      id: 2,
      fitid: 'TX1002',
      accountId: 1,
      amountCents: 15000,
      date: '2026-06-18',
      name: 'VIR RENARD SYLVAIN',
      memo: 'Cotisation 26-27',
      status: 'pending',
      createdAt: new Date()
    }).run();

    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([]);

    const aiMock = { run: vi.fn() };
    await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });

    const row = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 2)).all();
    const suggestions = JSON.parse(row[0].aiSuggestions);
    expect(suggestions.accrualType).toBe('produit_constate_avance');
    expect(suggestions.accrualNote).toContain('26-27');
    // L'exercice de rattachement, et pas seulement la phrase qui le nomme : c'est ce
    // champ que l'écran reprend et que le compte de résultat lit.
    expect(suggestions.targetSeason).toBe('26-27');
  });

  it('leaves a membership paid for the current season as a normal entry', async () => {
    await db.insert(bankStatementLinesTable).values({
      id: 3,
      fitid: 'TX1003',
      accountId: 1,
      amountCents: 15000,
      date: '2025-10-02',
      name: 'VIR RENARD SYLVAIN',
      memo: 'Cotisation 25-26',
      status: 'pending',
      createdAt: new Date()
    }).run();

    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([]);

    const aiMock = { run: vi.fn() };
    await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });

    const row = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 3)).all();
    const suggestions = JSON.parse(row[0].aiSuggestions);
    expect(suggestions.accrualType).toBe('normal');
    expect(suggestions.accrualNote).toBeNull();
    // Aucun rattachement à imposer : l'écran garde l'exercice consulté.
    expect(suggestions.targetSeason).toBeNull();
  });

  it('does not flag an expense that merely cites a future season', async () => {
    await db.insert(bankStatementLinesTable).values({
      id: 4,
      fitid: 'TX1004',
      accountId: 1,
      amountCents: -8000,
      date: '2026-06-18',
      name: 'ACHAT VOLANTS',
      memo: 'Provision 26-27',
      status: 'pending',
      createdAt: new Date()
    }).run();

    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([]);

    const aiMock = { run: vi.fn() };
    await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });

    const row = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 4)).all();
    const suggestions = JSON.parse(row[0].aiSuggestions);
    expect(suggestions.accrualType).toBe('normal');
  });

  it('associates the parent who pays his own licence, not the child he is parent of', async () => {
    // Cas réel : « DE: M RENARD SYLVAIN ... MOTIF: paiement Licence Sylvain Renard ».
    // L'enfant porte le nom du parent dans `parent1Name` et précède le parent en base :
    // le premier candidat trouvé gagnait, c'est-à-dire l'ordre des lignes.
    await db.insert(bankStatementLinesTable).values({
      id: 5,
      fitid: 'TX1005',
      accountId: 1,
      amountCents: 25000,
      date: '2026-08-21',
      name: 'VIR INST RE 673390599511',
      memo: 'DE: M RENARD SYLVAIN DATE: 21/08/2026 18:09 MOTIF: paiement Licence Sylvain Renard',
      status: 'pending',
      createdAt: new Date()
    }).run();

    const base = {
      seasonId: 1, gender: 'M', birthDate: '1980-01-01', type: 'Adulte', importedAt: new Date(),
      amountDue: 25000, amountReceived: 0, amountRemaining: 0,
      amountDueCents: 25000, amountReceivedCents: 25000, amountRemainingCents: 0
    };
    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([
      { ...base, id: 623, licence: '0000623', lastName: 'RENARD', firstName: 'Morgane', parent1Name: 'RENARD Sylvain (Parent)', parent2Name: 'RENARD Sylvain (Parent)' },
      { ...base, id: 624, licence: '0000624', lastName: 'RENARD', firstName: 'Sylvain', parent1Name: null, parent2Name: null }
    ] as any);

    // Le modèle se trompe d'adhérent : la désignation lue dans le texte tient.
    const aiMock = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({ memberId: 623, memberName: 'RENARD Morgane', category: 101, confidence: 0.9 })
      })
    };
    await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });

    const row = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 5)).all();
    const suggestions = JSON.parse(row[0].aiSuggestions);
    expect(suggestions.memberId).toBe(624);
    expect(suggestions.memberName).toContain('Sylvain');
  });

  it('reads the season glued to the wording of a transfer motive', async () => {
    // Cas réel : « MOTIF: FOSSE-JULES-ADHESION2026-2027 ».
    await db.insert(bankStatementLinesTable).values({
      id: 6,
      fitid: 'TX1006',
      accountId: 1,
      amountCents: 22000,
      date: '2026-08-21',
      name: 'VIR RECU 5281304281S',
      memo: 'DE: MR FOSSE JULES MOTIF: FOSSE-JULES-ADHESION2026-2027 REF: NOT PROVIDED',
      status: 'pending',
      createdAt: new Date()
    }).run();

    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([]);

    const aiMock = { run: vi.fn() };
    await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });

    const row = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 6)).all();
    const suggestions = JSON.parse(row[0].aiSuggestions);
    expect(suggestions.accrualType).toBe('produit_constate_avance');
    expect(suggestions.accrualNote).toContain('26-27');
  });

  it('associates a member who only exists in the season named by the reference', async () => {
    // Cas réel : « MOTIF: MAILLARD-DAVID-ADHESION2026-2027 ». Nouvel adhérent, absent
    // de la saison en cours : l'analyse ne pouvait proposer personne.
    await db.insert(seasonsTable).values({
      code: '26-27', name: 'Saison 26-27', startDate: '2026-09-01', endDate: '2027-08-31',
      active: false, closedAt: null, createdAt: new Date()
    }).run();

    await db.insert(bankStatementLinesTable).values({
      id: 7,
      fitid: 'TX1007',
      accountId: 1,
      amountCents: 26000,
      date: '2026-08-17',
      name: 'VIR INST RE 672885352540',
      memo: 'DE: M D MAILLARD MOTIF: MAILLARD-DAVID-ADHESION2026-2027',
      status: 'pending',
      createdAt: new Date()
    }).run();

    const base = {
      gender: 'M', birthDate: '1985-01-01', type: 'Adulte', importedAt: new Date(),
      amountDue: 26000, amountReceived: 0, amountRemaining: 26000,
      amountDueCents: 26000, amountReceivedCents: 0, amountRemainingCents: 26000,
      parent1Name: null, parent2Name: null
    };
    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockImplementation(
      async (_db: any, season: any) =>
        (season === '26-27'
          ? [{ ...base, id: 1134, licence: '0001134', seasonId: 2, lastName: 'MAILLARD', firstName: 'David' }]
          : []) as any
    );

    const aiMock = { run: vi.fn() };
    await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });

    const row = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 7)).all();
    const suggestions = JSON.parse(row[0].aiSuggestions);
    expect(suggestions.memberId).toBe(1134);
    expect(suggestions.accrualType).toBe('produit_constate_avance');
  });

  it('ne va chercher une autre saison que pour une cotisation payée d’avance', async () => {
    await db.insert(bankStatementLinesTable).values({
      id: 8,
      fitid: 'TX1008',
      accountId: 1,
      amountCents: 15000,
      date: '2025-10-02',
      name: 'VIR DUPONT',
      memo: 'Cotisation 25-26',
      status: 'pending',
      createdAt: new Date()
    }).run();

    // `vi.spyOn` rend l'espion **déjà posé** par les tests précédents, historique
    // compris : sans cette remise à zéro, on compterait leurs appels avec les nôtres.
    const spy = vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([]);
    spy.mockClear();

    const aiMock = { run: vi.fn() };
    await analyzeBankStatementLines(db, aiMock, { seasonId: '25-26' });

    expect(spy.mock.calls.map((c) => c[1])).toEqual(['25-26']);
  });
});
