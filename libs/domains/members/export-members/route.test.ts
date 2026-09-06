import { describe, it, expect, vi } from 'vitest';
import { exportMembersRoute } from './route';

vi.mock('./handler', () => ({
  exportMembersEmails: vi.fn().mockResolvedValue({ data: new Uint8Array([0xef, 0xbb, 0xbf, 0x41]), filename: 'adherents-emails-25-26.csv' })
}));

describe('exportMembersRoute', () => {
  it('rend un CSV en pièce jointe, octets intacts', async () => {
    const res = await exportMembersRoute.request('/export?season=25-26&status=valide', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="adherents-emails-25-26.csv"');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]));
  });

  it('exige la base', async () => {
    const res = await exportMembersRoute.request('/export', {}, {} as any);
    expect(res.status).toBe(500);
  });
});
