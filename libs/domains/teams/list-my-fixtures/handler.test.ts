import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { listMyFixtures } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamRoster } from '../save-team-roster/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { insertMemberFixture } from '@nba/members/test-fixtures';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
/** Huit caractères, comme partout : le domaine normalise, les fixtures doivent suivre. */
const LICENCE = '07104079';

describe('rencontres à venir d’un adhérent', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'S', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code=${SEASON}`))!.id;
    await insertMemberFixture(db, {
      licence: LICENCE, seasonId, lastName: 'Test', firstName: 'Alex',
      gender: 'M', birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW
    });
  });

  async function seed(days: Array<{ number: number; weekStart: string }>) {
    const team = await saveTeam(
      db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 }, NOW
    );
    await saveTeamRoster(db, { teamId: team.id, licences: [LICENCE] }, NOW);
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_mixte', days }, NOW);
    return team;
  }

  it('annonce la semaine tant que le capitaine n’a pas saisi la date', async () => {
    await seed([{ number: 1, weekStart: '2026-11-02' }]);

    const [result] = (await listMyFixtures(db, { licence: LICENCE, seasonCode: SEASON }, NOW)).fixtures;

    expect(result?.dayNumber).toBe(1);
    expect(result?.weekStart).toBe('2026-11-02');
    // Aucune date inventée : le capitaine ne l'a pas encore portée sur sa rencontre.
    expect(result?.date).toBeNull();
    expect(result?.dateSource).toBeNull();
    expect(result?.selected).toBe(false);
    // Aucune composition saisie : à distinguer d'une composition qui ne retient pas
    // l'adhérent, car l'une se relance et l'autre se constate.
    expect(result?.lineupExists).toBe(false);
  });

  it('rend les journées à venir dans l’ordre, la plus proche en tête', async () => {
    await seed([
      { number: 1, weekStart: '2026-09-07' },
      { number: 2, weekStart: '2026-10-05' },
      { number: 3, weekStart: '2026-11-02' }
    ]);

    const [result] = (await listMyFixtures(db, { licence: LICENCE, seasonCode: SEASON }, NOW)).fixtures;

    expect(result?.dayNumber).toBe(2);

    // La journée déjà passée ne revient pas ; les suivantes sont là, dans l'ordre.
    const { fixtures } = await listMyFixtures(db, { licence: LICENCE, seasonCode: SEASON }, NOW);
    expect(fixtures.map((f) => f.dayNumber)).toEqual([2, 3]);
  });

  it('garde la rencontre de la semaine en cours jusqu’à son dimanche', async () => {
    await seed([{ number: 1, weekStart: '2026-09-28' }]);

    // Vendredi de la semaine en cours : la rencontre est peut-être encore à jouer.
    const [result] = (
      await listMyFixtures(db, { licence: LICENCE, seasonCode: SEASON }, new Date('2026-10-02T08:00:00Z'))
    ).fixtures;

    expect(result?.dayNumber).toBe(1);
  });

  it('ne renvoie rien à qui n’appartient à aucune équipe', async () => {
    await db.run(sql`DELETE FROM team_roster`);
    await seed([{ number: 1, weekStart: '2026-11-02' }]);
    await db.run(sql`DELETE FROM team_roster`);

    expect((await listMyFixtures(db, { licence: LICENCE, seasonCode: SEASON }, NOW)).fixtures).toEqual([]);
  });
});
