import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { pushMessagesTable } from '@nba/notifications/schema';
import { remindMissingLineups } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { saveLineup } from '../save-lineup/handler';
import { playerRankingsTable } from '../shared/schema';
import type { SaveLineupSlot } from '../save-lineup/dto';
import { insertMemberFixture } from '@nba/members/test-fixtures';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const ELO = '2026-10-08';
/** Journée : semaine du lundi 2 au dimanche 8 novembre 2026. */
const WEEK = '2026-11-02';

describe('rappel des compositions manquantes', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'S', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code=${SEASON}`))!.id;
    await db.run(sql`
      INSERT INTO championship_settings (season_code, championship, reference_elo_date, updated_at)
      VALUES (${SEASON}, 'icd_mixte', ${ELO}, 0)
    `);
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: WEEK }] },
      NOW
    );
  });

  async function player(licence: string, gender: 'M' | 'F', email: string | null = null) {
    await insertMemberFixture(db, {
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender, birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW, email
    });
    await db.insert(playerRankingsTable).values({
      licence, eloDate: ELO, seasonCode: SEASON, lastName: `N${licence}`, firstName: 'Test',
      gender: gender === 'M' ? 'H' : 'F', category: 'Senior', mutation: 'none',
      singles: 'D9' as never, doubles: 'D9' as never, mixed: 'D9' as never,
      singlesRank: null, doublesRank: null, mixedRank: null,
      cpphSingles: null, cpphDoubles: null, cpphMixed: null,
      source: 'import', updatedAt: NOW
    });
  }

  const men = (p: string) => [1, 2, 3, 4, 5, 6].map((i) => `${p}00000${i}`.padStart(8, '0'));
  const women = (p: string) => [1, 2, 3, 4].map((i) => `${p}00001${i}`.padStart(8, '0'));

  function lines(m: string[], w: string[]): SaveLineupSlot[] {
    return [
      { discipline: 'SH', position: 1, licence1: m[0] },
      { discipline: 'SH', position: 2, licence1: m[1] },
      { discipline: 'SH', position: 3, licence1: m[2] },
      { discipline: 'SD', position: 1, licence1: w[0] },
      { discipline: 'DH', position: 1, licence1: m[3], licence2: m[4] },
      { discipline: 'DD', position: 1, licence1: w[1], licence2: w[2] },
      { discipline: 'MX', position: 1, licence1: m[5], licence2: w[3] }
    ];
  }

  /** Deux équipes en ICD mixte : le championnat porte un risque de valeur. */
  async function seedTwoTeams() {
    const mA = men('1'), wA = women('1'), mB = men('2'), wB = women('2');
    for (const l of [...mA, ...mB]) await player(l, 'M', `${l}@club.fr`);
    for (const l of [...wA, ...wB]) await player(l, 'F', `${l}@club.fr`);

    const one = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    const two = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 }, NOW);
    await saveTeamStaff(db, { teamId: one.id, captainLicence: mA[0], viceCaptainLicence: mA[1] }, NOW);
    await saveTeamStaff(db, { teamId: two.id, captainLicence: mB[0], viceCaptainLicence: null }, NOW);
    return { one, two, mA, wA, mB, wB };
  }

  it('relance les deux équipes la veille de la journée quand rien n’est validé', async () => {
    const { one, two } = await seedTwoTeams();

    const { reminded } = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-01T08:00' },
      NOW
    );

    expect(reminded.map((r) => r.teamId).sort()).toEqual([one.id, two.id].sort());
    const messages = await db.select().from(pushMessagesTable).all();
    expect(messages).toHaveLength(2);
    expect(messages[0].category).toBe('interclubs');
    expect(messages.map((m) => m.source).sort()).toEqual(
      [`teams:lineup-reminder:${one.id}:J1`, `teams:lineup-reminder:${two.id}:J1`].sort()
    );
  });

  it('ne relance pas avant la veille de la journée', async () => {
    await seedTwoTeams();

    const { reminded } = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-10-30T08:00' },
      NOW
    );

    expect(reminded).toEqual([]);
  });

  it('épargne l’équipe dont la composition est validée, relance l’autre', async () => {
    const { one, two, mA, wA } = await seedTwoTeams();
    await saveLineup(
      db,
      { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA), validate: true },
      NOW
    );
    await db.delete(pushMessagesTable).run();

    const { reminded } = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-03T08:00' },
      NOW
    );

    expect(reminded).toEqual([{ teamId: two.id, dayNumber: 1 }]);
  });

  it('un brouillon ne suffit pas : l’équipe reste relancée', async () => {
    const { one, mA, wA } = await seedTwoTeams();
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA) }, NOW);

    const { reminded } = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-01T08:00' },
      NOW
    );

    expect(reminded.map((r) => r.teamId)).toContain(one.id);
  });

  it('s’arrête une fois l’horaire de la première rencontre du club dépassé', async () => {
    const { one, mA, wA } = await seedTwoTeams();
    // Une rencontre est fixée au vendredi soir : c'est l'échéance partagée.
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA) }, NOW);
    await db.run(sql`UPDATE team_fixtures SET played_at = '2026-11-06T20:00' WHERE team_id = ${one.id}`);

    const before = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-06T19:00' },
      NOW
    );
    expect(before.reminded).toHaveLength(2);

    await db.delete(pushMessagesTable).run();
    const after = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-06T21:00' },
      new Date('2026-11-06T20:30:00Z')
    );
    expect(after.reminded).toEqual([]);
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(0);
  });

  it('ne relance qu’une fois par jour, même si le cron repasse', async () => {
    await seedTwoTeams();

    const first = await remindMissingLineups(db, { seasonCode: SEASON, parisNow: '2026-11-01T08:00' }, NOW);
    expect(first.reminded).toHaveLength(2);

    const second = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-01T09:00' },
      new Date(NOW.getTime() + 60 * 60 * 1000)
    );
    expect(second.reminded).toEqual([]);
    // Deux messages seulement : la seconde passe a été absorbée par la dédup.
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(2);
  });

  it('ignore un championnat où le club n’a qu’une équipe : aucun risque de valeur', async () => {
    const mA = men('1'), wA = women('1');
    for (const l of mA) await player(l, 'M', `${l}@club.fr`);
    for (const l of wA) await player(l, 'F', `${l}@club.fr`);
    const one = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    await saveTeamStaff(db, { teamId: one.id, captainLicence: mA[0], viceCaptainLicence: null }, NOW);

    const { reminded } = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-01T08:00' },
      NOW
    );

    expect(reminded).toEqual([]);
  });

  it('ignore les vétérans : pas de hiérarchie de valeur, même à deux équipes', async () => {
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_veterans', days: [{ number: 1, weekStart: WEEK }] },
      NOW
    );
    await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D1', number: 1 }, NOW);
    await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D1', number: 2 }, NOW);

    const { reminded } = await remindMissingLineups(
      db,
      { seasonCode: SEASON, parisNow: '2026-11-01T08:00' },
      NOW
    );

    expect(reminded).toEqual([]);
  });
});
