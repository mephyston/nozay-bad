// eslint-disable-next-line no-restricted-imports
import { membersTable } from '@nba/members/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { categoriesTable } from '@nba/accounting/schema';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { analyzeBankStatementLines } from './handler';
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

    await db.insert(membersTable).values({
      id: 1,
      licence: '123456',
      seasonId: 1,
      lastName: 'Dupont',
      firstName: 'Marc',
      gender: 'M',
      birthDate: '1990-01-01',
      type: 'Adulte',
      importedAt: new Date(),
      amountDueCents: 15000,
      amountReceivedCents: 0,
      amountRemainingCents: 15000
    }).run();

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
});
