import { describe, it, expect } from 'vitest';
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

  it('should return 403 if no ai:* permission', async () => {
    const res = await generateAiAnalysisRoute.request('http://localhost/2026/ai/analysis', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-permissions': 'other:permission'
      },
      body: JSON.stringify({ report: { bilanTrésorerie: [] }, section: 'tresorerie' })
    }, { AI: {} });
    expect(res.status).toBe(403);
  });
});
