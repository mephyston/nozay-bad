import { describe, it, expect, vi } from 'vitest';
import { listBankStatementLinesRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { listBankStatementLines } from './handler';

vi.mock('./handler', () => ({
  listBankStatementLines: vi.fn(),
}));

describe('listBankStatementLines Route', () => {
  it('should return 400 when season is missing or empty', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await listBankStatementLinesRoute.request(
      'http://localhost/bank-statement-lines',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid query parameters', async () => {
    const { mockD1 } = await setupMockDb();
    const mockData = [{ id: 1, amount: 100 }];
    vi.mocked(listBankStatementLines).mockResolvedValue(mockData as any);

    const res = await listBankStatementLinesRoute.request(
      'http://localhost/bank-statement-lines?season=2024-2025&status=reconciled&accountId=abc',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockData);
    expect(listBankStatementLines).toHaveBeenCalledWith(
      expect.anything(),
      { seasonId: '2024-2025', filters: { status: 'reconciled', accountId: 'abc' } }
    );
  });
});
