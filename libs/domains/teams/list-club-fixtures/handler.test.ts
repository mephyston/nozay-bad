import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { listClubFixtures } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { publishRosters } from '../publish-rosters/handler';
import { championshipDaysTable, teamFixturesTable } from '../shared/schema';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';

describe('rencontres de toutes les équipes du club', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`INSERT INTO seasons (code, name, start_date, end_date, active, created_at) VALUES (${SEASON}, 'S', '2026-09-01', '2027-08-31', 1, 0)`);
    await publishRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', published: true }, NOW);
  });

  async function team(number: number, championship: 'icd_mixte' | 'icd_masculin' = 'icd_mixte') {
    return saveTeam(db, { seasonCode: SEASON, championship, division: 'D2', number }, NOW);
  }

  async function fixture(teamId: number, dayNumber: number, values: { playedAt?: string; opponent?: string; venue?: string; status?: 'bye' }) {
    const day = (await db.select().from(championshipDaysTable).all()).find((d) => d.number === dayNumber)!;
    await db.insert(teamFixturesTable).values({ teamId, dayId: day.id, createdAt: NOW, ...values });
  }

  it('donne quand, où et contre qui, pour chaque équipe publiée, dans l\'ordre des dates', async () => {
    const two = await team(2);
    const one = await team(1);
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-11-02' }] }, NOW);
    await fixture(two.id, 1, { playedAt: '2026-11-04T20:00', opponent: 'Orsay 3', venue: 'Gymnase A' });
    await fixture(one.id, 1, { playedAt: '2026-11-05T20:30', opponent: 'Massy 1' });

    const { fixtures, teams } = await listClubFixtures(db, { seasonCode: SEASON }, NOW);

    expect(fixtures.map((f) => [f.teamNumber, f.date, f.opponent, f.venue])).toEqual([
      [2, '2026-11-04T20:00', 'Orsay 3', 'Gymnase A'],
      [1, '2026-11-05T20:30', 'Massy 1', null]
    ]);
    expect(fixtures[0]).toMatchObject({ dateSource: 'captain', dayNumber: 1, championshipShortLabel: 'ICD Mixte' });
    expect(teams.map((t) => t.number)).toEqual([1, 2]);
    expect(fixtures[0]).not.toHaveProperty('lineupStatus');
  });

  it('borne la période sur la date réelle, et sur la semaine tant qu\'elle manque', async () => {
    const one = await team(1);
    const two = await team(2);
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-11-02' }] }, NOW);
    await fixture(one.id, 1, { playedAt: '2026-11-06T20:00' });

    const friday = await listClubFixtures(db, { seasonCode: SEASON, from: '2026-11-06', to: '2026-11-08' }, NOW);
    // Sans date, une rencontre se range au début de sa semaine.
    expect(friday.fixtures.map((f) => f.teamNumber)).toEqual([2, 1]);
    expect(friday.fixtures[0]).toMatchObject({ date: null, dateSource: null });

    const monday = await listClubFixtures(db, { seasonCode: SEASON, from: '2026-11-02', to: '2026-11-02' }, NOW);
    // L'équipe 1 joue vendredi : hors du lundi. L'équipe 2, sans date, reste dans sa semaine.
    expect(monday.fixtures.map((f) => f.teamNumber)).toEqual([2]);
  });

  it('annonce les deux rencontres d\'une journée de vétérans, et tait le rang exempt', async () => {
    await publishRosters(db, { seasonCode: SEASON, championship: 'icd_veterans', published: true }, NOW);
    const vets = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D1', number: 1 }, NOW);
    const other = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D1', number: 2 }, NOW);
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_veterans', days: [{ number: 1, weekStart: '2026-11-23' }] }, NOW);
    const day = (await db.select().from(championshipDaysTable).all()).find((d) => d.championship === 'icd_veterans')!;
    await db.insert(teamFixturesTable).values([
      { teamId: vets.id, dayId: day.id, slot: 1, playedAt: '2026-11-29T09:00', opponent: 'A', createdAt: NOW },
      { teamId: vets.id, dayId: day.id, slot: 2, playedAt: '2026-11-29T14:00', opponent: 'B', createdAt: NOW },
      // Poule impaire : l'équipe 2 ne joue qu'une rencontre.
      { teamId: other.id, dayId: day.id, slot: 2, status: 'bye', createdAt: NOW }
    ]);

    const { fixtures } = await listClubFixtures(db, { seasonCode: SEASON }, NOW);
    const shown = fixtures.filter((f) => f.championshipShortLabel === 'ICD Vétérans').map((f) => [f.teamNumber, f.slot, f.opponent]);
    expect(shown).toEqual([[2, 1, null], [1, 1, 'A'], [1, 2, 'B']]);
  });

  it('lit toute une saison sans dépasser la limite de variables de D1', async () => {
    const one = await team(1);
    const days = Array.from({ length: 120 }, (_, i) => ({ number: i + 1, weekStart: new Date(Date.UTC(2026, 9, 5 + 7 * (i % 40))).toISOString().slice(0, 10) }));
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_mixte', days: days.slice(0, 40) }, NOW);
    await fixture(one.id, 40, { playedAt: '2027-07-08T20:00', opponent: 'Dernier' });
    const { fixtures } = await listClubFixtures(db, { seasonCode: SEASON }, NOW);
    expect(fixtures).toHaveLength(40);
    expect(fixtures.at(-1)).toMatchObject({ opponent: 'Dernier' });
  });

  it('tait les équipes au repos et les championnats non publiés', async () => {
    const one = await team(1);
    await team(3, 'icd_masculin');
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-11-02' }] }, NOW);
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_masculin', days: [{ number: 1, weekStart: '2026-11-02' }] }, NOW);
    await fixture(one.id, 1, { status: 'bye' });

    const { fixtures, teams } = await listClubFixtures(db, { seasonCode: SEASON }, NOW);
    expect(fixtures).toEqual([]);
    expect(teams.map((t) => t.number)).toEqual([1]);
  });
});
