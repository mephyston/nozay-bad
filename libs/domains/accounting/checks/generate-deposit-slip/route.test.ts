import { describe, it, expect, vi } from 'vitest';
import { generateDepositSlipRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { generateDepositSlip } from './handler';

// Le handler est doublé, comme dans les autres tests de route : importé pour de vrai, il
// tire `@nba/members-api`, qui remonte jusqu'au routeur accounting en cours d'évaluation.
vi.mock('./handler', () => ({
  generateDepositSlip: vi.fn()
}));

describe('Generate Deposit Slip Route', () => {
  it('refuse un identifiant non numérique', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await generateDepositSlipRoute.request('http://localhost/check-deposits/not-a-number/deposit-slip.pdf', {
      method: 'GET'
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
  });

  it('sert le PDF en ligne, sans mise en cache', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(generateDepositSlip).mockResolvedValue({ pdf: new TextEncoder().encode('%PDF-1.7'), filename: 'Bordereau-REMISE-1.pdf' });

    const res = await generateDepositSlipRoute.request('http://localhost/check-deposits/1/deposit-slip.pdf', {
      method: 'GET'
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('inline; filename="Bordereau-REMISE-1.pdf"');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(vi.mocked(generateDepositSlip)).toHaveBeenCalledWith(expect.anything(), 1);
  });
});
