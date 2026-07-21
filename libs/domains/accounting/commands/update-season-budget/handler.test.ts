import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSeasonBudget } from './handler';
import { UpdateSeasonBudgetRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-api';
vi.mock('@metacult/features-members-api', () => ({ isSeasonClosed: vi.fn() }));

vi.mock('./repository');

describe('updateSeasonBudget', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    (isSeasonClosed as any).mockResolvedValue(false);
    
    const mockRepoInstance = {
      updateBudget: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(UpdateSeasonBudgetRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, payload];
    await (updateSeasonBudget as any)(...args);

    // Assert
    
    expect(mockRepoInstance.updateBudget).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    (isSeasonClosed as any).mockResolvedValue(true);

    const mockRepoInstance = {
      updateBudget: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(UpdateSeasonBudgetRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, payload];
    await expect((updateSeasonBudget as any)(...args)).rejects.toThrow();
  });
});
