import { describe, it, expect, vi } from 'vitest';
import { suggestBudgetRoute } from './route';

describe('Suggest Budget Route', () => {
  it('should return 400 on invalid body', async () => {
    const res = await suggestBudgetRoute.request('http://localhost/2026/ai/budget-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: {} }) // Missing required fields
    });
    expect(res.status).toBe(400);
  });

  // Le droit « ai:assistant:use » est désormais exigé par ROUTE_PERMISSIONS, en amont
  // de ce gestionnaire : voir apps/api/src/authz/middleware.test.ts. Cette route ne
  // lit plus d'en-tête de permissions, qui portait une décision d'autorisation au
  // lieu d'une identité.

  it('should return 200 on valid body and mock AI', async () => {
    const mockAI = {
      run: vi.fn().mockResolvedValue({ response: '{"suggestions": []}' })
    };
    const res = await suggestBudgetRoute.request('http://localhost/2026/ai/budget-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: {}, categories: [], currentBudget: {} })
    }, { AI: mockAI });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
  });
});
