import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveRanking } from './handler';
import { listRankings } from '../list-rankings/handler';
import { playerRankingsTable } from '../shared/schema';
import { RankingNotFoundError } from '../shared/errors';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const LICENCE = '07104079';

describe('corriger un classement à la main', () => {
  let db: Db;

  async function snapshot(eloDate: string, singles: string) {
    await db.insert(playerRankingsTable).values({
      licence: LICENCE, eloDate, seasonCode: SEASON, lastName: 'Test', firstName: 'Alex',
      gender: 'H', category: 'Senior', mutation: 'none',
      singles: singles as never, doubles: 'D9', mixed: 'D9',
      singlesRank: null, doublesRank: null, mixedRank: null,
      cpphSingles: null, cpphDoubles: null, cpphMixed: null,
      source: 'import', updatedAt: NOW
    });
  }

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('écrit la correction et marque la ligne comme saisie à la main', async () => {
    await snapshot('2026-08-13', 'D9');

    const result = await saveRanking(db, { licence: LICENCE, eloDate: '2026-08-13', singles: 'D7' }, NOW);

    expect(result.singles).toBe('D7');
    expect(result.source).toBe('manuel');
    // Les disciplines non envoyées restent en place.
    expect(result.doubles).toBe('D9');
  });

  it('ne touche pas les autres instantanés', async () => {
    await snapshot('2026-08-13', 'D9');
    await snapshot('2026-11-05', 'D9');

    await saveRanking(db, { licence: LICENCE, eloDate: '2026-11-05', singles: 'R6' }, NOW);

    // Corriger une date antérieure changerait rétroactivement la conformité de
    // compositions déjà validées : un instantané est un fait daté.
    const august = await listRankings(db, { seasonCode: SEASON, eloDate: '2026-08-13' });
    expect(august.rows[0].singles).toBe('D9');
    expect(august.rows[0].source).toBe('import');
  });

  it('distingue « non compétiteur » de « NC »', async () => {
    await snapshot('2026-08-13', 'D9');

    const cleared = await saveRanking(db, { licence: LICENCE, eloDate: '2026-08-13', singles: null }, NOW);
    expect(cleared.singles).toBeNull();

    const nc = await saveRanking(db, { licence: LICENCE, eloDate: '2026-08-13', singles: 'NC' }, NOW);
    // `NC` vaut zéro point mais reste un classement : le joueur peut être aligné.
    expect(nc.singles).toBe('NC');
  });

  it('normalise la licence avant de chercher la ligne', async () => {
    await snapshot('2026-08-13', 'D9');

    // Huit caractères en base, sept saisis : sans normalisation la correction se perdrait.
    const result = await saveRanking(db, { licence: '7104079', eloDate: '2026-08-13', mixed: 'R5' }, NOW);

    expect(result.mixed).toBe('R5');
  });

  it('refuse une date où ce licencié n’a pas de classement', async () => {
    await snapshot('2026-08-13', 'D9');

    await expect(
      saveRanking(db, { licence: LICENCE, eloDate: '2026-11-05', singles: 'D7' }, NOW)
    ).rejects.toThrow(RankingNotFoundError);
  });
});
