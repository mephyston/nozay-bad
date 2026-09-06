import { describe, it, expect, vi } from 'vitest';
import { recordCheckTransactionRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { createCheck, updateCheck } from './handler';

vi.mock('./handler', () => ({
  createCheck: vi.fn(),
  analyzeCheckImage: vi.fn(),
  deleteCheck: vi.fn(),
  updateCheck: vi.fn(),
}));

describe('RecordCheckLedgerEntry Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await recordCheckTransactionRoute.request('http://localhost/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '',
        number: '1234567',
        amount: 100
        // Missing emitter
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createCheck).mockResolvedValue({ id: 1 } as any);

    const res = await recordCheckTransactionRoute.request('http://localhost/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        number: '1234567',
        amount: 100,
        emitter: 'John Doe',
        bank: 'My Bank',
        memberId: 42,
        category: 'Adhésion',
        description: 'Test check',
        date: '2026-07-22',
        photoUrl: 'http://example.com/check.jpg'
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1 });
  });

  it('should return 400 when handler throws an error', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createCheck).mockRejectedValue(new Error('Saison clôturée'));

    const res = await recordCheckTransactionRoute.request('http://localhost/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        number: '1234567',
        amount: 100,
        emitter: 'John Doe'
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Saison clôturée');
  });

  describe('PUT /checks/:id', () => {
    const corps = { number: '1234567', amount: 1500, emitter: 'Jane Doe', date: '2026-09-01' };
    const put = (id: string, body: unknown, mockD1: unknown) =>
      recordCheckTransactionRoute.request(`http://localhost/checks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, { DB: mockD1 as any });

    it('refuse un identifiant non numérique', async () => {
      const { mockD1 } = await setupMockDb();
      const res = await put('abc', corps, mockD1);
      expect(res.status).toBe(400);
      expect(vi.mocked(updateCheck)).not.toHaveBeenCalled();
    });

    it('refuse un corps incomplet', async () => {
      const { mockD1 } = await setupMockDb();
      const res = await put('1', { number: '1234567' }, mockD1);
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain('Validation failed');
    });

    it('accepte memberId et bank à null, pour détacher', async () => {
      const { mockD1 } = await setupMockDb();
      vi.mocked(updateCheck).mockResolvedValue({ id: 1, number: '1234567' } as any);

      const res = await put('1', { ...corps, memberId: null, bank: null, category: 2 }, mockD1);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data).toEqual({ id: 1, number: '1234567' });
      expect(vi.mocked(updateCheck)).toHaveBeenCalledWith(expect.anything(), 1, expect.objectContaining({ memberId: null, bank: null }));
    });

    it('relaie le statut porté par une AppError', async () => {
      const { mockD1 } = await setupMockDb();
      vi.mocked(updateCheck).mockRejectedValue(Object.assign(new Error('Chèque non trouvé.'), { status: 404 }));

      const res = await put('7', corps, mockD1);
      expect(res.status).toBe(404);
      expect(((await res.json()) as any).error).toBe('Chèque non trouvé.');
    });
  });
});
