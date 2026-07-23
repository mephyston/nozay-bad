import { describe, it, expect } from 'vitest';
import { createAccountClassRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';

describe('CreateAccountClass Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createAccountClassRoute.request('http://localhost/account-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '', label: 'Test' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createAccountClassRoute.request('http://localhost/account-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '60', label: 'Achats', type: 'depense' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
  });
});
