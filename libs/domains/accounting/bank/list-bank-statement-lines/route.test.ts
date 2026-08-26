import { describe, it, expect, vi } from 'vitest';
import { listBankStatementLinesRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { listBankStatementLines } from './handler';

vi.mock('./handler', () => ({
  listBankStatementLines: vi.fn(),
}));

describe('listBankStatementLines Route', () => {
  /*
    Sans exercice, la liste n'est plus refusée : elle rend tout.

    Une ligne de relevé n'appartient à aucun exercice — `bank_statement_lines` ne porte pas de
    `season_id`, c'est un mouvement daté. Exiger une saison faisait disparaître de la file toute
    ligne datée hors de l'exercice consulté, soit au 1er septembre tout ce qui restait à
    rapprocher de l'année écoulée.
  */
  it("rend toutes les lignes quand aucun exercice n'est demandé", async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(listBankStatementLines).mockResolvedValue([] as any);

    const res = await listBankStatementLinesRoute.request(
      'http://localhost/bank-statement-lines',
      { method: 'GET' },
      { DB: mockD1 as any }
    );

    expect(res.status).toBe(200);
    expect(listBankStatementLines).toHaveBeenCalledWith(
      expect.anything(),
      { seasonId: undefined, filters: { status: undefined, accountId: undefined } }
    );
  });

  it('should return 200 on valid query parameters', async () => {
    const { mockD1 } = await setupMockDb();
    const mockData = [{ id: 1, amount: 100 }];
    vi.mocked(listBankStatementLines).mockResolvedValue(mockData as any);

    const res = await listBankStatementLinesRoute.request(
      'http://localhost/bank-statement-lines?season=2024-2025&status=reconciled&accountId=abc',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockData);
    expect(listBankStatementLines).toHaveBeenCalledWith(
      expect.anything(),
      { seasonId: '2024-2025', filters: { status: 'reconciled', accountId: 'abc' } }
    );
  });
});
