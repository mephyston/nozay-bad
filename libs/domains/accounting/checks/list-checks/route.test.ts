import { describe, it, expect, vi } from 'vitest';
import { listChecksRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { listChecks, listCheckDeposits } from './handler';

vi.mock('./handler', () => ({
  listChecks: vi.fn(),
  listCheckDeposits: vi.fn(),
}));

describe('listChecks Route', () => {
  describe('GET /checks', () => {
    it('should return 400 when season is missing', async () => {
      const { mockD1 } = await setupMockDb();
      const res = await listChecksRoute.request(
        'http://localhost/checks',
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
      const mockData = [{ id: 1, number: '12345' }];
      vi.mocked(listChecks).mockResolvedValue(mockData as any);

      const res = await listChecksRoute.request(
        'http://localhost/checks?season=2024-2025&status=pending',
        { method: 'GET' },
        { DB: mockD1 as any }
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockData);
      expect(listChecks).toHaveBeenCalledWith(expect.anything(), '2024-2025', 'pending');
    });
  });

  describe('GET /check-deposits', () => {
    it('should return 400 when season is missing', async () => {
      const { mockD1 } = await setupMockDb();
      const res = await listChecksRoute.request(
        'http://localhost/check-deposits',
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
      const mockData = [{ id: 2, amount: 500 }];
      vi.mocked(listCheckDeposits).mockResolvedValue(mockData as any);

      const res = await listChecksRoute.request(
        'http://localhost/check-deposits?season=2024-2025',
        { method: 'GET' },
        { DB: mockD1 as any }
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockData);
      expect(listCheckDeposits).toHaveBeenCalledWith(expect.anything(), '2024-2025');
    });
  });
});
