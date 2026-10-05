import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { saveChampionshipRosters } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamRoster } from '../save-team-roster/handler';
import { getRosterBalance } from '../get-roster-balance/handler';
import { playerRankingsTable } from '../shared/schema';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const ELO = '2026-09-03';

describe('équilibrage des effectifs — vivier et application', () => {
  let db: Db;
  let seasonId: number;
  let one: { id: number };
  let two: { id: number };

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${SEASON}`))!.id;
    await db.run(sql`
      INSERT INTO championship_settings (season_code, championship, reference_elo_date, updated_at)
      VALUES (${SEASON}, 'icd_mixte', ${ELO}, 0)
    `);
    for (const [licence, ranking] of [['10000001', 'D7'], ['10000002', 'P10'], ['10000003', 'D9']]) {
      await insertMemberFixture(db, {
        licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
        gender: 'M', birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW
      });
      await db.insert(playerRankingsTable).values({
        licence, eloDate: ELO, seasonCode: SEASON, lastName: `N${licence}`, firstName: 'Test',
        gender: 'H', category: 'Senior', mutation: 'none',
        singles: ranking as never, doubles: ranking as never, mixed: ranking as never,
        singlesRank: null, doublesRank: null, mixedRank: null,
        cpphSingles: null, cpphDoubles: null, cpphMixed: null, source: 'import', updatedAt: NOW
      });
    }
    one = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    two = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D3', number: 2 }, NOW);
    await saveTeamRoster(db, { teamId: one.id, licences: ['10000002'] }, NOW);
    await saveTeamRoster(db, { teamId: two.id, licences: ['10000001', '10000003'] }, NOW);
  });

  it('livre le vivier du championnat, au classement de référence de la saison', async () => {
    const pool = await getRosterBalance(db, { seasonCode: SEASON, championship: 'icd_mixte' });
    expect(pool.referenceEloDate).toBe(ELO);
    expect(pool.teams.map((t) => t.number)).toEqual([1, 2]);
    const fort = pool.players.find((p) => p.licence === '10000001')!;
    expect(fort.singles).toBe('D7');
    expect(fort.teamId).toBe(two.id);
    expect(pool.unknown).toEqual([]);
  });

  it("remplace d'un bloc les effectifs de toutes les équipes", async () => {
    const result = await saveChampionshipRosters(db, {
      seasonCode: SEASON,
      championship: 'icd_mixte',
      rosters: [
        { teamId: one.id, licences: ['10000001'] },
        { teamId: two.id, licences: ['10000002', '10000003'] }
      ]
    }, NOW);
    expect(result).toMatchObject({ teams: 2, count: 3, rejected: [], outOfCategory: [] });
    const pool = await getRosterBalance(db, { seasonCode: SEASON, championship: 'icd_mixte' });
    expect(pool.players.find((p) => p.licence === '10000001')!.teamId).toBe(one.id);
  });

  it('refuse une répartition qui oublie une équipe, ou inscrit un joueur deux fois', async () => {
    await expect(
      saveChampionshipRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', rosters: [{ teamId: one.id, licences: [] }] }, NOW)
    ).rejects.toThrow(/chaque équipe active/);
    await expect(
      saveChampionshipRosters(db, {
        seasonCode: SEASON,
        championship: 'icd_mixte',
        rosters: [{ teamId: one.id, licences: ['10000001'] }, { teamId: two.id, licences: ['10000001'] }]
      }, NOW)
    ).rejects.toThrow(/deux équipes/);
    // Rien n'a bougé.
    const pool = await getRosterBalance(db, { seasonCode: SEASON, championship: 'icd_mixte' });
    expect(pool.players.find((p) => p.licence === '10000001')!.teamId).toBe(two.id);
  });
});
