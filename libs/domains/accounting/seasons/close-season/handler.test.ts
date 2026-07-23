import { describe, it, expect } from 'vitest';
import { closeSeason } from './handler';
import { CloseSeasonRepositoryInterface } from './repository';

class InMemoryCloseSeasonRepository implements CloseSeasonRepositoryInterface {
  private seasons = new Map<string, any>();

  constructor(initialSeasons: any[] = []) {
    for (const season of initialSeasons) {
      this.seasons.set(season.id, season);
    }
  }

  async getSeasonById(db: any, id: string): Promise<any | undefined> {
    return this.seasons.get(id);
  }

  async updateSeason(db: any, id: string, values: { closed?: boolean }): Promise<any | undefined> {
    const existing = this.seasons.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...values };
    this.seasons.set(id, updated);
    return updated;
  }
}

describe('closeSeason', () => {
  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const repo = new InMemoryCloseSeasonRepository([
      { id: '1', name: 'Saison 1', closed: false }
    ]);

    // Act
    const result = await closeSeason({}, '1', repo);

    // Assert
    expect(result.closed).toBe(true);
    const season = await repo.getSeasonById({}, '1');
    expect(season?.closed).toBe(true);
  });

  it('should throw if season already closed', async () => {
    // Arrange
    const repo = new InMemoryCloseSeasonRepository([
      { id: '1', name: 'Saison 1', closed: true }
    ]);

    // Act & Assert
    await expect(closeSeason({}, '1', repo)).rejects.toThrow('Saison déjà clôturée');
  });

  it('should throw if season not found', async () => {
    // Arrange
    const repo = new InMemoryCloseSeasonRepository([]);

    // Act & Assert
    await expect(closeSeason({}, '1', repo)).rejects.toThrow('Saison introuvable');
  });
});
