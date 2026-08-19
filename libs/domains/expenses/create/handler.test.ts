import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExpense } from './handler';
import { CreateExpenseRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { SeasonClosedError } from '../shared/errors';

vi.mock('./repository', () => {
  const CreateExpenseRepository = vi.fn();
  CreateExpenseRepository.prototype.create = vi.fn().mockResolvedValue({ id: 1, status: 'pending' });
  CreateExpenseRepository.prototype.resolveSeasonId = vi.fn().mockResolvedValue(1);
  return { CreateExpenseRepository };
});

vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn()
}));

vi.mock('@nba/accounting-api', () => ({
  normalizeCategory: vi.fn((c) => (typeof c === 'number' ? c : null))
}));

describe('createExpense handler', () => {
  const db = {} as any; // Mock DB

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an expense successfully (nominal case)', async () => {
    vi.mocked(isSeasonClosed).mockResolvedValue(false);

    const body = {
      seasonId: 'season-1',
      description: 'Test expense',
      category: 1,
      amount: 100,
      emitterName: 'John Doe',
    };

    const result = await createExpense(db, body);

    expect(isSeasonClosed).toHaveBeenCalledWith(db, 'season-1');
    expect(CreateExpenseRepository).toHaveBeenCalled();
    const repoInstance = vi.mocked(CreateExpenseRepository).mock.results[0]?.value;
    expect(repoInstance.create).toHaveBeenCalledWith(db, expect.objectContaining({
      seasonId: 1,
      description: 'Test expense',
      categoryId: 1,
      amountCents: 100,
      status: 'pending',
      emitterName: 'John Doe',
    }));
    expect(result).toEqual({ id: 1, status: 'pending' });
  });

  it('refuse une saison non résolue plutôt que de se replier sur la saison 1', async () => {
    vi.mocked(isSeasonClosed).mockResolvedValue(false);
    const repoProto = CreateExpenseRepository.prototype as any;
    repoProto.resolveSeasonId.mockResolvedValueOnce(undefined);

    await expect(
      createExpense(db, {
        seasonId: 'saison-fantome',
        description: 'Test',
        category: 1,
        amount: 100,
        emitterName: 'John Doe',
      })
    ).rejects.toThrow('Saison inconnue');
    expect(repoProto.create).not.toHaveBeenCalled();
  });

  it("refuse une catégorie inconnue plutôt que de l'imputer aux Adhésions", async () => {
    vi.mocked(isSeasonClosed).mockResolvedValue(false);

    await expect(
      createExpense(db, {
        seasonId: 'season-1',
        description: 'Test',
        category: 'categorie-fantome',
        amount: 100,
        emitterName: 'John Doe',
      })
    ).rejects.toThrow('Catégorie inconnue');
    expect((CreateExpenseRepository.prototype as any).create).not.toHaveBeenCalled();
  });

  it('should throw SeasonClosedError if season is closed (business error)', async () => {
    vi.mocked(isSeasonClosed).mockResolvedValue(true);

    const body = {
      seasonId: 'season-2',
      description: 'Test expense',
      category: 1,
      amount: 100,
      emitterName: 'John Doe',
    };

    await expect(createExpense(db, body)).rejects.toThrow(SeasonClosedError);
    expect(isSeasonClosed).toHaveBeenCalledWith(db, 'season-2');
    expect(CreateExpenseRepository).not.toHaveBeenCalled();
  });
});
