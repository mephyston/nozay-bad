import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { eq } from 'drizzle-orm';
import { setMemberExpenseAuthorization } from './handler';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { membershipsTable } from '@nba/members/schema';

describe('setMemberExpenseAuthorization', () => {
  let db: any;

  beforeEach(async () => {
    const m = await setupMockDb();
    db = m.db;
    await db
      .insert(seasonsTable)
      .values({ id: 1, code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() })
      .run();
    await insertMemberFixture(db, {
        id: 1,
        licence: '1000001',
        seasonId: 1,
        lastName: 'Martin',
        firstName: 'Léa',
        gender: 'F',
        birthDate: '2010-01-01',
        type: 'jeune',
        importedAt: new Date()
      });
  });

  it('est à false par défaut (migration 0007)', async () => {
    const row = await db.select().from(membershipsTable).where(eq(membershipsTable.id, 1)).get();
    expect(row.expenseAuthorized).toBe(false);
  });

  it('active puis retire l’autorisation', async () => {
    const r1 = await setMemberExpenseAuthorization(db, 1, true);
    expect(r1.expenseAuthorized).toBe(true);
    let row = await db.select().from(membershipsTable).where(eq(membershipsTable.id, 1)).get();
    expect(row.expenseAuthorized).toBe(true);

    await setMemberExpenseAuthorization(db, 1, false);
    row = await db.select().from(membershipsTable).where(eq(membershipsTable.id, 1)).get();
    expect(row.expenseAuthorized).toBe(false);
  });

  it('rejette un adhérent introuvable', async () => {
    await expect(setMemberExpenseAuthorization(db, 999, true)).rejects.toThrow();
  });
});
