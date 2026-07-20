import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeasonBudget } from './handler';
import { GetSeasonBudgetRepository } from './repository';


vi.mock('./repository');

describe('getSeasonBudget', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      getBudget: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(GetSeasonBudgetRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '23-24'];
    await (getSeasonBudget as any)(...args);

    // Assert
    
    expect(mockRepoInstance.getBudget).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      getBudget: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(GetSeasonBudgetRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '23-24'];
    await expect((getSeasonBudget as any)(...args)).rejects.toThrow();
  });
});
