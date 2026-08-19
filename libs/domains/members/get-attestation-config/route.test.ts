import { describe, it, expect } from 'vitest';
import { getAttestationConfigRoute } from './route';

describe('Get Attestation Config Route', () => {
  it('should return 500 if DB is missing', async () => {
    const res = await getAttestationConfigRoute.request('http://localhost/attestation/config', {
      method: 'GET'
    });
    expect(res.status).toBe(500);
  });
});
