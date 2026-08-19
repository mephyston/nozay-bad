import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveFixture } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { listChampionshipDays } from '../list-championship-days/handler';
import { teamFixturesTable } from '../shared/schema';
import {
  ChampionshipDayNotFoundError,
  InvalidLineupError,
  TeamNotFoundError
} from '../shared/errors';

const NOW = new Date('2026-09-01T10:00:00Z');
const SEASON = '26-27';

describe('rencontres', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
  });

  /** Une équipe de mixte et une journée dont la semaine commence le lundi 12/10/2026. */
  async function setup(championship: 'icd_mixte' | 'icr_seniors' = 'icd_mixte') {
    const division = championship === 'icd_mixte' ? 'D2' : 'R2';
    const team = await saveTeam(db, { seasonCode: SEASON, championship, division, number: 1 }, NOW);
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship, days: [{ number: 1, weekStart: '2026-10-12' }] },
      NOW
    );
    const day = (await listChampionshipDays(db, SEASON, championship)).days[0];
    return { team, day };
  }

  it('place une rencontre sur une journée', async () => {
    const { team, day } = await setup();

    const fixture = await saveFixture(
      db,
      { teamId: team.id, dayId: day.id, opponent: 'BC Massy 2', home: true, playedAt: '2026-10-17T18:00' },
      NOW
    );

    expect(fixture).toMatchObject({ teamId: team.id, dayId: day.id, slot: 1 });
  });

  it('refuse une journée qui appartient à un autre championnat', async () => {
    const { team } = await setup('icd_mixte');
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_masculin', days: [{ number: 1, weekStart: '2026-10-12' }] },
      NOW
    );
    const foreignDay = (await listChampionshipDays(db, SEASON, 'icd_masculin')).days[0];

    await expect(
      saveFixture(db, { teamId: team.id, dayId: foreignDay.id }, NOW)
    ).rejects.toBeInstanceOf(InvalidLineupError);
  });

  it('accepte le dimanche, dernier jour de la semaine', async () => {
    const { team, day } = await setup();

    const fixture = await saveFixture(
      db,
      { teamId: team.id, dayId: day.id, playedAt: '2026-10-18T14:00' },
      NOW
    );

    expect(fixture.outsideTheoreticalWeek).toBe(false);
  });

  describe('report exceptionnel (art. 4.2.3)', () => {
    it('accepte une rencontre déplacée hors de la semaine, et la signale', async () => {
      const { team, day } = await setup();

      // Gymnase indisponible : la rencontre est jouée la semaine suivante.
      const fixture = await saveFixture(
        db,
        { teamId: team.id, dayId: day.id, playedAt: '2026-10-24T18:00' },
        NOW
      );

      expect(fixture.outsideTheoreticalWeek).toBe(true);
    });

    it('ne déplace pas la journée : c’est elle qui porte les règles', async () => {
      const { team, day } = await setup();
      const fixture = await saveFixture(
        db,
        { teamId: team.id, dayId: day.id, playedAt: '2026-10-24T18:00' },
        NOW
      );

      // La rencontre reste rattachée à J1 et à sa semaine théorique : c'est contre les
      // autres J1 du club que sa valeur se compare, et là que joue l'unicité d'équipe.
      expect(fixture.dayId).toBe(day.id);
      const [row] = await db.select().from(teamFixturesTable).all();
      expect(row.dayId).toBe(day.id);
      expect(row.playedAt).toBe('2026-10-24T18:00');
    });

    it('ne signale rien quand aucune date n’est saisie', async () => {
      const { team, day } = await setup();

      const fixture = await saveFixture(db, { teamId: team.id, dayId: day.id }, NOW);

      expect(fixture.outsideTheoreticalWeek).toBe(false);
    });
  });

  it('refuse un second slot en départemental, qui n’a qu’une rencontre par journée', async () => {
    const { team, day } = await setup('icd_mixte');

    await expect(
      saveFixture(db, { teamId: team.id, dayId: day.id, slot: 2 }, NOW)
    ).rejects.toBeInstanceOf(InvalidLineupError);
  });

  it('accepte deux rencontres par journée en régional (art. 1.6.3)', async () => {
    const { team, day } = await setup('icr_seniors');

    await saveFixture(db, { teamId: team.id, dayId: day.id, slot: 1, opponent: 'A' }, NOW);
    await saveFixture(db, { teamId: team.id, dayId: day.id, slot: 2, opponent: 'B' }, NOW);

    expect(await db.select().from(teamFixturesTable).all()).toHaveLength(2);
  });

  it('met à jour la rencontre sans la recréer : la composition doit survivre', async () => {
    const { team, day } = await setup();
    const first = await saveFixture(db, { teamId: team.id, dayId: day.id, opponent: 'A' }, NOW);

    const updated = await saveFixture(db, { teamId: team.id, dayId: day.id, opponent: 'B' }, NOW);

    expect(updated.id).toBe(first.id);
    expect((await db.select().from(teamFixturesTable).all())[0].opponent).toBe('B');
  });

  it('enregistre une équipe au repos', async () => {
    const { team, day } = await setup();

    await saveFixture(db, { teamId: team.id, dayId: day.id, status: 'bye' }, NOW);

    expect((await db.select().from(teamFixturesTable).all())[0].status).toBe('bye');
  });

  it('refuse une équipe ou une journée inconnue', async () => {
    const { team, day } = await setup();

    await expect(saveFixture(db, { teamId: 9999, dayId: day.id }, NOW)).rejects.toBeInstanceOf(
      TeamNotFoundError
    );
    await expect(saveFixture(db, { teamId: team.id, dayId: 9999 }, NOW)).rejects.toBeInstanceOf(
      ChampionshipDayNotFoundError
    );
  });
});
