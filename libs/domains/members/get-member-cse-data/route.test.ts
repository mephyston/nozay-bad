import { describe, it, expect, vi } from 'vitest';
import { getMemberCseDataRoute } from './route';

vi.mock('./handler', () => ({
  getMemberCseData: vi.fn().mockResolvedValue({ memberId: 42, cseAttestation: true })
}));

describe('getMemberCseDataRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await getMemberCseDataRoute.request('/42/cse-data', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await getMemberCseDataRoute.request('/abc/cse-data', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
