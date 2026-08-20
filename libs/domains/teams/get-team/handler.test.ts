import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { getTeam } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { saveFixture } from '../save-fixture/handler';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';

describe('calendrier d’une équipe', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
  });

  async function team(championship: 'icr_seniors' | 'icd_mixte', division: string) {
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship, days: [{ number: 1, weekStart: '2026-11-02' }] },
      NOW
    );
    return saveTeam(db, { seasonCode: SEASON, championship, division, number: 1 }, NOW);
  }

  /**
   * Le régional dispute deux rencontres par journée (art. 1.6.3). Le calendrier les
   * indexait par journée, si bien que la seconde écrasait la première : elle
   * n'apparaissait nulle part et aucune URL ne permettait de l'atteindre.
   */
  it('expose les deux rencontres d’une journée régionale', async () => {
    const one = await team('icr_seniors', 'R1');
    const view = await getTeam(db, one.id);

    const day1 = view.calendar.filter((d) => d.number === 1);
    expect(day1).toHaveLength(2);
    expect(day1.map((d) => d.slot)).toEqual([1, 2]);
  });

  it('n’expose qu’une rencontre là où le championnat n’en compte qu’une', async () => {
    const one = await team('icd_mixte', 'D2');
    const view = await getTeam(db, one.id);

    const day1 = view.calendar.filter((d) => d.number === 1);
    expect(day1).toHaveLength(1);
    expect(day1[0].slot).toBe(1);
    // Rien à distinguer : l'écran s'en tient au libellé de la journée.
    expect(day1[0].fixtureLabel).toBeNull();
  });

  it('nomme chaque rencontre par son adversaire, et par son rang à défaut', async () => {
    const one = await team('icr_seniors', 'R1');
    const dayId = (await db.get<{ id: number }>(
      sql`SELECT id FROM championship_days WHERE season_code = ${SEASON} AND championship = 'icr_seniors' AND number = 1`
    ))!.id;

    await saveFixture(db, { teamId: one.id, dayId, slot: 1, opponent: 'Massy 2' }, NOW);

    const view = await getTeam(db, one.id);
    const day1 = view.calendar.filter((d) => d.number === 1);

    expect(day1[0].fixtureLabel).toBe('Massy 2');
    // La seconde n'a pas d'adversaire saisi : le rang prend le relais plutôt que de
    // laisser deux entrées indiscernables.
    expect(day1[1].fixtureLabel).toBe('Rencontre 2');
  });

  /**
   * Le rang attendu doit exister même sans rencontre en base : un capitaine compose
   * souvent avant que la date ou l'adversaire ne soient connus.
   */
  it('propose la seconde rencontre avant même qu’elle existe en base', async () => {
    const one = await team('icr_seniors', 'R1');
    const view = await getTeam(db, one.id);

    const second = view.calendar.find((d) => d.number === 1 && d.slot === 2)!;
    expect(second).toBeDefined();
    expect(second.playedAt).toBeNull();
    expect(second.filledLines).toBe(0);
  });
});
