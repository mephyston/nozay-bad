import { describe, it, expect, vi } from 'vitest';
import { getMemberByLicenceRoute } from './route';

vi.mock('./handler', () => ({
  getMemberByLicence: vi.fn().mockResolvedValue({ id: 1, licence: '123456' })
}));

describe('getMemberByLicenceRoute', () => {
  it('handles valid input with optional season query', async () => {
    const res = await getMemberByLicenceRoute.request('/123456?season=25-26', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('handles valid input without optional season query', async () => {
    const res = await getMemberByLicenceRoute.request('/123456', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for empty licence parameter', async () => {
    const res = await getMemberByLicenceRoute.request('/%20', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
