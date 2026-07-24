import { describe, it, expect, vi } from 'vitest';
import { importBankStatementRoute } from './route';

vi.mock('./handler', () => ({
  importBankStatement: vi.fn().mockResolvedValue({ importedCount: 5 })
}));

describe('importBankStatementRoute', () => {
  it('handles valid form input with file and seasonId', async () => {
    const formData = new FormData();
    formData.append('seasonId', '25-26');
    formData.append('file', 'Date;Label;Amount\n2026-01-01;Test;10.00');

    const res = await importBankStatementRoute.request('/bank-statement-lines/import', {
      method: 'POST',
      body: formData
    }, { DB: {} as any });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 when missing seasonId', async () => {
    const formData = new FormData();
    formData.append('file', 'test');

    const res = await importBankStatementRoute.request('/bank-statement-lines/import', {
      method: 'POST',
      body: formData
    }, { DB: {} as any });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
