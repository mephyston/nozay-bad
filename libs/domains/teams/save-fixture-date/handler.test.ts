import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveFixtureDate } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { listChampionshipDays } from '../list-championship-days/handler';
import { loadLineup } from '../get-lineup/handler';
import { teamFixturesTable } from '../shared/schema';
import { InvalidLineupError, NotTeamCaptainError } from '../shared/errors';
import { insertMemberFixture } from '@nba/members/test-fixtures';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const CAPTAIN = '00000001';
const OTHER = '00000002';

describe('date réelle d’une rencontre', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'S', '2026-09-01', '2027-08-31', 1, 0)
    `);
    const seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code=${SEASON}`))!.id;
    for (const licence of [CAPTAIN, OTHER]) {
      await insertMemberFixture(db, {
        licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
        gender: 'M', birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW
      });
    }
  });

  /** Une équipe de mixte dont la J1 court du lundi 2 au dimanche 8 novembre 2026. */
  async function setup(championship: 'icd_mixte' | 'icd_veterans' = 'icd_mixte') {
    const division = championship === 'icd_mixte' ? 'D2' : 'D2';
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship, days: [{ number: 1, weekStart: '2026-11-02' }] },
      NOW
    );
    const team = await saveTeam(db, { seasonCode: SEASON, championship, division, number: 1 }, NOW);
    await saveTeamStaff(db, { teamId: team.id, captainLicence: CAPTAIN, viceCaptainLicence: null }, NOW);
    return team;
  }

  it('enregistre une date dans la semaine de la journée', async () => {
    const team = await setup();

    const result = await saveFixtureDate(
      db,
      { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-05T20:00', venue: 'Pierre Dupuis' },
      NOW
    );

    expect(result.playedAt).toBe('2026-11-05T20:00');
    expect(result.outsideTheoreticalWeek).toBe(false);
    expect(result.matchDay).toBe('allowed'); // jeudi : le mixte se joue en semaine
  });

  it('signale un jour inhabituel sans le refuser', async () => {
    const team = await setup();

    // Le mixte se joue du lundi au vendredi : un dimanche est inhabituel, pas interdit.
    const result = await saveFixtureDate(
      db,
      { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-08T10:00' },
      NOW
    );

    expect(result.matchDay).toBe('unusual');
    expect(result.playedAt).toBe('2026-11-08T10:00');
  });

  describe('sortie de la semaine théorique', () => {
    it('refuse par défaut : c’est presque toujours une faute de frappe', async () => {
      const team = await setup();

      await expect(
        saveFixtureDate(
          db,
          { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-12T20:00' },
          NOW
        )
      ).rejects.toBeInstanceOf(InvalidLineupError);
    });

    it('explique ce que le capitaine confirmerait', async () => {
      const team = await setup();

      await expect(
        saveFixtureDate(
          db,
          { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-12T20:00' },
          NOW
        )
      ).rejects.toThrow(/la journée restera la même/);
    });

    it('accepte le report une fois confirmé', async () => {
      const team = await setup();

      const result = await saveFixtureDate(
        db,
        {
          teamId: team.id, dayNumber: 1, licence: CAPTAIN,
          playedAt: '2026-11-12T20:00', confirmOutsideWeek: true
        },
        NOW
      );

      expect(result.outsideTheoreticalWeek).toBe(true);
      expect(result.playedAt).toBe('2026-11-12T20:00');
    });

    it('ne déplace pas la journée : la semaine théorique reste celle du calendrier', async () => {
      const team = await setup();
      await saveFixtureDate(
        db,
        {
          teamId: team.id, dayNumber: 1, licence: CAPTAIN,
          playedAt: '2026-11-12T20:00', confirmOutsideWeek: true
        },
        NOW
      );

      const { days } = await listChampionshipDays(db, SEASON, 'icd_mixte');
      expect(days[0].weekStart).toBe('2026-11-02');

      // Et la composition reste jugée sur cette semaine-là.
      const lineup = await loadLineup(db, { teamId: team.id, dayNumber: 1 });
      expect(lineup.weekStart).toBe('2026-11-02');
    });
  });

  it('efface la date avec null', async () => {
    const team = await setup();
    await saveFixtureDate(
      db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-05T20:00' }, NOW
    );

    const result = await saveFixtureDate(
      db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: null }, NOW
    );

    expect(result.playedAt).toBeNull();
  });

  it('ne recrée pas la rencontre : la composition doit survivre au changement d’horaire', async () => {
    const team = await setup();
    const first = await saveFixtureDate(
      db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-05T20:00' }, NOW
    );
    await saveFixtureDate(
      db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-06T20:30' }, NOW
    );

    const rows = await db.select().from(teamFixturesTable).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].playedAt).toBe('2026-11-06T20:30');
    expect(first.teamId).toBe(team.id);
  });

  it('refuse un adhérent qui n’est ni capitaine ni vice-capitaine', async () => {
    const team = await setup();

    await expect(
      saveFixtureDate(
        db, { teamId: team.id, dayNumber: 1, licence: OTHER, playedAt: '2026-11-05T20:00' }, NOW
      )
    ).rejects.toBeInstanceOf(NotTeamCaptainError);
  });

  it('reconnaît le dimanche comme le jour normal des vétérans', async () => {
    const team = await setup('icd_veterans');

    const result = await saveFixtureDate(
      db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, playedAt: '2026-11-08T09:00' }, NOW
    );

    expect(result.matchDay).toBe('allowed');
  });
});
