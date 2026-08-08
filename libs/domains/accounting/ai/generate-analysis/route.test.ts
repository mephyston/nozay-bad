import { describe, it, expect, vi } from 'vitest';
import { generateAiAnalysisRoute } from './route';

describe('Generate Analysis Route', () => {
  it('should return 400 on invalid body', async () => {
    const res = await generateAiAnalysisRoute.request('http://localhost/2026/ai/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'invalid' })
    });
    expect(res.status).toBe(400);
  });

  it('should return 500 when the AI binding is missing', async () => {
    const res = await generateAiAnalysisRoute.request('http://localhost/2026/ai/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: { bilanTrésorerie: [] }, section: 'tresorerie' })
    }, {});
    expect(res.status).toBe(500);
  });

  // Le droit « ai:assistant:use » est désormais exigé par ROUTE_PERMISSIONS, en amont
  // de ce gestionnaire : voir apps/api/src/authz/middleware.test.ts. Cette route ne
  // lit plus d'en-tête de permissions, qui portait une décision d'autorisation au
  // lieu d'une identité.
  it('streams an analysis when the AI binding is available', async () => {
    const mockAI = { run: vi.fn().mockResolvedValue({ response: 'Analyse' }) };
    const res = await generateAiAnalysisRoute.request('http://localhost/2026/ai/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: { bilanTrésorerie: [] }, section: 'tresorerie' })
    }, { AI: mockAI });
    expect(res.status).toBe(200);
  });
});
