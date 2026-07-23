import { describe, it, expect, vi } from 'vitest';
import { listChecks, listCheckDeposits } from './handler';

vi.mock('./repository', () => {
  return {
    ListChecksRepository: class {
      listChecks = vi.fn().mockResolvedValue([
        { id: 1, seasonId: '2023', number: '1234567', amount: 100 }
      ]);
      listCheckDeposits = vi.fn().mockResolvedValue([
        { id: 1, seasonId: '2023', reference: 'DEP-1', amount: 100 }
      ]);
    }
  };
});

describe('list-checks handler', () => {
  it('should list checks', async () => {
    const db = {};
    const result = await listChecks(db, '2023');
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe('1234567');
  });

  it('should list check deposits', async () => {
    const db = {};
    const result = await listCheckDeposits(db, '2023');
    expect(result).toHaveLength(1);
    expect(result[0].reference).toBe('DEP-1');
  });
});
