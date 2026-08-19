import { describe, it, expect, vi } from 'vitest';
import { analyzeBankStatementLinesRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { analyzeBankStatementLines } from './handler';

vi.mock('./handler', () => ({
  analyzeBankStatementLines: vi.fn(),
}));

describe('analyzeBankStatementLines Route', () => {
  it('should return 400 when season is missing', async () => {
    const { mockD1 } = await setupMockDb();
    const aiMock = {};
    const res = await analyzeBankStatementLinesRoute.request(
      'http://localhost/bank-statement-lines/analyze',
      { method: 'POST' },
      { DB: mockD1 as any, AI: aiMock as any }
    );
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid query parameters', async () => {
    const { mockD1 } = await setupMockDb();
    const aiMock = {};
    const mockData = { analyzedCount: 5 };
    vi.mocked(analyzeBankStatementLines).mockResolvedValue(mockData as any);

    const res = await analyzeBankStatementLinesRoute.request(
      'http://localhost/bank-statement-lines/analyze?season=2024-2025&id=42',
      { method: 'POST' },
      { DB: mockD1 as any, AI: aiMock as any }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.analyzedCount).toBe(5);
    expect(analyzeBankStatementLines).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { seasonId: '2024-2025', singleId: 42 }
    );
  });
});
