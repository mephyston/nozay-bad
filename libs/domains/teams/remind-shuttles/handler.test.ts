import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { pushMessagesTable } from '@nba/notifications/schema';
import { isShuttlesReminderDue, remindShuttles } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { publishRosters } from '../publish-rosters/handler';
import { championshipDaysTable, teamFixturesTable } from '../shared/schema';

const NOW = new Date('2026-11-26T07:00:00Z');
const SEASON = '26-27';
const CAPTAIN = '07104079';

describe('rappel des volants aux vétérans', () => {
  let db: Db;
  let teamId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`INSERT INTO seasons (code, name, start_date, end_date, active, created_at) VALUES (${SEASON}, 'S', '2026-09-01', '2027-08-31', 1, 0)`);
    const seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code=${SEASON}`))!.id;
    await insertMemberFixture(db, {
      licence: CAPTAIN, seasonId, lastName: 'Capitaine', firstName: 'Alex', gender: 'M', birthDate: '1970-01-01', type: 'Adulte', importedAt: NOW, email: 'capitaine@example.org'
    } as any);
    await publishRosters(db, { seasonCode: SEASON, championship: 'icd_veterans', published: true }, NOW);
    teamId = (await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D1', number: 1 }, NOW)).id;
    await saveTeamStaff(db, { teamId, captainLicence: CAPTAIN, viceCaptainLicence: null }, NOW);
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_veterans', days: [{ number: 2, weekStart: '2026-11-23' }] }, NOW);
  });

  const messages = async () => (await db.select().from(pushMessagesTable).all()).filter((m: any) => m.source?.startsWith('teams:shuttles-reminder'));

  async function playOn(playedAt: string, status: 'scheduled' | 'bye' = 'scheduled') {
    const day = (await db.select().from(championshipDaysTable).all())[0];
    await db.insert(teamFixturesTable).values({ teamId, dayId: day.id, playedAt, status, createdAt: NOW });
  }

  it("vise le jeudi à 19 h 30, jusqu'à la fin de l'heure", () => {
    expect(isShuttlesReminderDue({ weekday: 'THU', dateTime: '2026-11-26T19:30', hour: 19 })).toBe(true);
    expect(isShuttlesReminderDue({ weekday: 'THU', dateTime: '2026-11-26T19:55', hour: 19 })).toBe(true);
    expect(isShuttlesReminderDue({ weekday: 'THU', dateTime: '2026-11-26T19:25', hour: 19 })).toBe(false);
    expect(isShuttlesReminderDue({ weekday: 'THU', dateTime: '2026-11-26T20:00', hour: 20 })).toBe(false);
    expect(isShuttlesReminderDue({ weekday: 'WED', dateTime: '2026-11-25T19:30', hour: 19 })).toBe(false);
  });

  it('prévient le capitaine le jeudi pour la rencontre du week-end, une seule fois', async () => {
    await playOn('2026-11-29T09:00');
    expect((await remindShuttles(db, { seasonCode: SEASON, today: '2026-11-26' }, NOW)).reminded).toEqual([{ teamId, dayNumber: 2 }]);
    const [message] = await messages();
    expect(message).toMatchObject({ title: expect.stringContaining('volants à prévoir'), category: 'interclubs' });
    expect(message.body).toContain('dimanche 29 novembre');
    expect((await remindShuttles(db, { seasonCode: SEASON, today: '2026-11-26' }, NOW)).reminded).toEqual([]);
  });

  it('couvre le samedi par dérogation, mais pas la semaine suivante', async () => {
    await playOn('2026-11-28T14:00');
    expect((await remindShuttles(db, { seasonCode: SEASON, today: '2026-11-26' }, NOW)).reminded).toHaveLength(1);
    expect((await remindShuttles(db, { seasonCode: SEASON, today: '2026-11-19' }, NOW)).reminded).toEqual([]);
  });

  it('se tait pour une équipe exempte des deux rencontres de la journée', async () => {
    const day = (await db.select().from(championshipDaysTable).all())[0];
    await db.insert(teamFixturesTable).values([
      { teamId, dayId: day.id, slot: 1, playedAt: '2026-11-29T09:00', status: 'bye', createdAt: NOW },
      { teamId, dayId: day.id, slot: 2, playedAt: '2026-11-29T14:00', status: 'bye', createdAt: NOW }
    ]);
    expect((await remindShuttles(db, { seasonCode: SEASON, today: '2026-11-26' }, NOW)).reminded).toEqual([]);
  });

  it('un seul rappel pour une journée à deux rencontres, même si la première est exempte', async () => {
    const day = (await db.select().from(championshipDaysTable).all())[0];
    await db.insert(teamFixturesTable).values([
      { teamId, dayId: day.id, slot: 1, playedAt: '2026-11-29T09:00', status: 'bye', createdAt: NOW },
      { teamId, dayId: day.id, slot: 2, playedAt: '2026-11-29T14:00', createdAt: NOW }
    ]);
    expect((await remindShuttles(db, { seasonCode: SEASON, today: '2026-11-26' }, NOW)).reminded).toEqual([{ teamId, dayNumber: 2 }]);
    expect(await messages()).toHaveLength(1);
  });

  it("ne concerne pas les championnats qui ne le demandent pas", async () => {
    await publishRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', published: true }, NOW);
    const mixte = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    await saveTeamStaff(db, { teamId: mixte.id, captainLicence: CAPTAIN, viceCaptainLicence: null }, NOW);
    await saveChampionshipDays(db, { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 2, weekStart: '2026-11-23' }] }, NOW);
    const day = (await db.select().from(championshipDaysTable).all()).find((d) => d.championship === 'icd_mixte')!;
    await db.insert(teamFixturesTable).values({ teamId: mixte.id, dayId: day.id, playedAt: '2026-11-29T20:00', createdAt: NOW });
    expect((await remindShuttles(db, { seasonCode: SEASON, today: '2026-11-26' }, NOW)).reminded).toEqual([]);
  });
});
