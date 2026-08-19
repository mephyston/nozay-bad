import { describe, it, expect, vi } from 'vitest';

vi.mock('./handler', () => ({
  exportSeasonArchive: vi.fn().mockResolvedValue({ data: new Uint8Array(), filename: 'test.zip', mimeType: 'application/zip' })
}));

import { exportSeasonRoute } from './route';

describe('Export Season Route', () => {
  it('should return 500 if DB is missing', async () => {
    const res = await exportSeasonRoute.request('http://localhost/seasons/2026/export', {
      method: 'GET'
    });
    expect(res.status).toBe(500);
  });
});
