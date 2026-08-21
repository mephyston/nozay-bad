import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { setExpenseAuthorizationRoute } from './route';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('setExpenseAuthorizationRoute (PATCH /:id/expense-authorization)', () => {
  let mockD1: any;

  beforeEach(async () => {
    const m = await setupMockDb();
    mockD1 = m.mockD1;
    await m.db.insert(seasonsTable).values({ id: 1, code: '25-26', name: 'S', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() }).run();
    await insertMemberFixture(m.db, { id: 1, licence: '1000001', seasonId: 1, lastName: 'X', firstName: 'Y', gender: 'M', birthDate: '2010-01-01', type: 'jeune', importedAt: new Date() });
  });

  it('autorise (200) et persiste', async () => {
    const res = await setExpenseAuthorizationRoute.request(
      'http://localhost/1/expense-authorization',
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authorized: true }) },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.expenseAuthorized).toBe(true);
  });

  it('400 si body invalide', async () => {
    const res = await setExpenseAuthorizationRoute.request(
      'http://localhost/1/expense-authorization',
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(400);
  });
});
