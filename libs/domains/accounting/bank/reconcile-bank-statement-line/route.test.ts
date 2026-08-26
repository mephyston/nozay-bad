import { describe, it, expect, vi } from 'vitest';
import { reconcileBankStatementLineRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { reconcileBankStatementLine, reconcileBulkTransactions } from './handler';

vi.mock('./handler', () => ({
  reconcileBankStatementLine: vi.fn(),
  reconcileBulkTransactions: vi.fn(),
}));

describe('ReconcileBankStatementLine Route', () => {
  describe('POST /bank-statement-lines/reconcile-bulk', () => {
    it('should return 400 on invalid body', async () => {
      const { mockD1 } = await setupMockDb();
      const res = await reconcileBankStatementLineRoute.request('http://localhost/bank-statement-lines/reconcile-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              btId: 'invalid-id-type-should-be-number',
              action: 'match'
            }
          ]
        })
      }, { DB: mockD1 as any });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toContain('Validation failed');
    });

    it('should return 200 on valid body', async () => {
      const { mockD1 } = await setupMockDb();
      vi.mocked(reconcileBulkTransactions).mockResolvedValue({ count: 1, lines: [{ id: 7, status: 'reconciled' }], entries: [{ id: 42 }] } as any);

      const res = await reconcileBankStatementLineRoute.request('http://localhost/bank-statement-lines/reconcile-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              btId: 123,
              action: 'match',
              ledgerEntryId: 456
            }
          ]
        })
      }, { DB: mockD1 as any });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.count).toBe(1);
    });
  });

  describe('POST /bank-statement-lines/:id/reconcile', () => {
    it('should return 400 on invalid body', async () => {
      const { mockD1 } = await setupMockDb();
      const res = await reconcileBankStatementLineRoute.request('http://localhost/bank-statement-lines/123/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invalid-action' // Invalid action value
        })
      }, { DB: mockD1 as any });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toContain('Validation failed');
    });

    it('should return 200 on valid body', async () => {
      const { mockD1 } = await setupMockDb();
      vi.mocked(reconcileBankStatementLine).mockResolvedValue({
        line: { id: 123, status: 'reconciled' },
        entries: [{ id: 42, bankStatementLineId: 123 }]
      } as any);

      const res = await reconcileBankStatementLineRoute.request('http://localhost/bank-statement-lines/123/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          transaction: {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            amount: 50,
            date: '2026-07-22',
            paymentMethod: 'virement',
            description: 'Created from bank statement'
          }
        })
      }, { DB: mockD1 as any });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      /*
        La réponse porte ce qui vient d'être écrit, pas un simple accusé : c'est ce qui permet à
        l'écran de se mettre à jour sans se recharger.
      */
      expect(body.line).toEqual({ id: 123, status: 'reconciled' });
      expect(body.entries).toEqual([{ id: 42, bankStatementLineId: 123 }]);
    });
  });
});