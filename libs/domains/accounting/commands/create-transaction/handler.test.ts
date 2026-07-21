import { describe, it, expect, vi } from 'vitest';
import { createTransaction } from './handler';
import { CreateTransactionRepository } from './repository';
import * as membersDataAccess from '@metacult/features-members-api';

vi.mock('./repository');
vi.mock('@metacult/features-members-api', () => ({
  isSeasonClosed: vi.fn()
}));

describe('createTransaction', () => {
  it('should create a transaction successfully', async () => {
    const mockDb = {};
    const mockDto = {
      seasonId: 'season1',
      type: 'recette' as const,
      accountId: 'account1',
      category: 'cat1',
      amount: 100,
      date: '2023-01-01',
      paymentMethod: 'card',
      description: 'Test'
    };

    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(false);
    vi.mocked(CreateTransactionRepository.prototype.create).mockResolvedValue({ id: 1 });

    const result = await createTransaction(mockDb, mockDto);

    expect(result).toEqual({ id: 1 });
    expect(CreateTransactionRepository.prototype.create).toHaveBeenCalled();
  });

  it('should throw an error if season is closed', async () => {
    const mockDb = {};
    const mockDto = {
      seasonId: 'season1',
      type: 'recette' as const,
      accountId: 'account1',
      category: 'cat1',
      amount: 100,
      date: '2023-01-01',
      paymentMethod: 'card',
      description: 'Test'
    };

    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(true);

    await expect(createTransaction(mockDb, mockDto)).rejects.toThrowError(/La saison est clôturée/);
  });
});
