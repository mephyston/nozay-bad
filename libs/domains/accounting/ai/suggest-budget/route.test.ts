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

  it('should return 403 if no ai:* permission', async () => {
    const res = await suggestBudgetRoute.request('http://localhost/2026/ai/budget-suggestion', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-permissions': 'other:permission'
      },
      body: JSON.stringify({ report: {}, categories: [], currentBudget: {} })
    }, { AI: {} });
    expect(res.status).toBe(403);
  });

  it('should return 200 on valid body and mock AI', async () => {
    const mockAI = {
      run: vi.fn().mockResolvedValue({ response: '{"suggestions": []}' })
    };
    const res = await suggestBudgetRoute.request('http://localhost/2026/ai/budget-suggestion', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-permissions': 'ai:*'
      },
      body: JSON.stringify({ report: {}, categories: [], currentBudget: {} })
    }, { AI: mockAI });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
  });
});
