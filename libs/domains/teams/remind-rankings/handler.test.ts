import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { findRankingReminderDays } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
/** Lundi de la journée : le jeudi de référence ELO est donc le 2026-10-29. */
const WEEK = '2026-11-02';
const THURSDAY = '2026-10-29';

describe('journées à rappel de classements', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'S', '2026-09-01', '2027-08-31', 1, 0)
    `);
  });

  it('trouve la journée régionale dont le jeudi de référence est aujourd’hui', async () => {
    await saveTeam(db, { seasonCode: SEASON, championship: 'icr_seniors', division: 'R3', number: 1 }, NOW);
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icr_seniors', days: [{ number: 3, weekStart: WEEK }] },
      NOW
    );

    const days = await findRankingReminderDays(db, SEASON, THURSDAY);

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ championship: 'icr_seniors', dayNumber: 3, weekStart: WEEK });
  });

  it('ignore le départemental : son classement est figé pour la saison', async () => {
    await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: WEEK }] },
      NOW
    );

    expect(await findRankingReminderDays(db, SEASON, THURSDAY)).toEqual([]);
  });

  it('ignore un championnat où le club n’aligne aucune équipe active', async () => {
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icr_seniors', days: [{ number: 3, weekStart: WEEK }] },
      NOW
    );

    expect(await findRankingReminderDays(db, SEASON, THURSDAY)).toEqual([]);
  });

  it('ne rend rien un autre jour que le jeudi J−4', async () => {
    await saveTeam(db, { seasonCode: SEASON, championship: 'icr_seniors', division: 'R3', number: 1 }, NOW);
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icr_seniors', days: [{ number: 3, weekStart: WEEK }] },
      NOW
    );

    expect(await findRankingReminderDays(db, SEASON, '2026-10-28')).toEqual([]);
    expect(await findRankingReminderDays(db, SEASON, '2026-10-30')).toEqual([]);
  });
});
