import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCategories } from './handler';
import { ListCategoriesRepository } from './repository';

vi.mock('./repository');

describe('listCategories', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should return categories preserving receiptCode and expenseCode', async () => {
    const mockCategories = [
      {
        id: 1,
        adminLabel: 'Adhésions',
        adherentLabel: 'Adhésions',
        hideInExpenses: false,
        receiptCode: '75',
        expenseCode: '67'
      }
    ];

    const mockRepoInstance = {
      listCategories: vi.fn().mockResolvedValue(mockCategories)
    };
    (vi.mocked(ListCategoriesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    const result = await listCategories(db);

    expect(mockRepoInstance.listCategories).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect((result[0] as any).receiptCode).toBe('75');
    expect((result[0] as any).expenseCode).toBe('67');
  });

  it('should throw a business error', async () => {
    const mockRepoInstance = {
      listCategories: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(ListCategoriesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    await expect(listCategories(db)).rejects.toThrow('Business error');
  });
});
