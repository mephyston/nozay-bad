import { describe, it, expect, vi } from 'vitest';

vi.mock('./handler', () => ({
  generateCseAttestation: vi.fn().mockResolvedValue({ pdf: new Uint8Array(), filename: 'test.pdf' })
}));

import { generateCseAttestationRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';

describe('Generate CSE Attestation Route', () => {
  it('should return 400 on invalid param', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await generateCseAttestationRoute.request('http://localhost/not-a-number/cse-attestation.pdf', {
      method: 'GET'
    }, { DB: mockD1 as any, MEDIA: {} as any });
    expect(res.status).toBe(400);
  });
});
