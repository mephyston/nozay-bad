import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { getPlayerCard } from './handler';

const SEASON = '25-26';
const LICENCE = '06123456';

describe('getPlayerCard', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  async function team(number: number, championship = 'icd_mixte', division = 'D2', active = 1) {
    await db.run(sql`
      INSERT INTO club_teams (season_code, championship, division, number, active, created_at)
      VALUES (${SEASON}, ${championship}, ${division}, ${number}, ${active}, 0)
    `);
    const row = await db.get<{ id: number }>(sql`SELECT last_insert_rowid() as id`);
    return row!.id;
  }

  const enrol = (teamId: number, licence = LICENCE) =>
    db.run(sql`INSERT INTO team_roster (team_id, licence, created_at) VALUES (${teamId}, ${licence}, 0)`);

  const rank = (eloDate: string, singles: string | null, doubles: string | null, mixed: string | null) =>
    db.run(sql`
      INSERT INTO player_rankings (licence, elo_date, season_code, last_name, first_name, gender, singles, doubles, mixed, updated_at)
      VALUES (${LICENCE}, ${eloDate}, ${SEASON}, 'Martin', 'Léa', 'F', ${singles}, ${doubles}, ${mixed}, 0)
    `);

  it('rend les équipes de la saison où la licence figure', async () => {
    await enrol(await team(1));
    await enrol(await team(2, 'icr_seniors', 'R2'));
    await team(3); // équipe sans l'adhérent

    const card = await getPlayerCard(db, { licence: LICENCE, seasonCode: SEASON });

    expect(card.teams.map((t) => t.name)).toEqual(['NBA91-1', 'NBA91-2']);
    expect(card.teams[1].championshipLabel).toBeTruthy();
    expect(card.teams[1].divisionLabel).toBeTruthy();
  });

  it('ignore une équipe désactivée', async () => {
    await enrol(await team(1, 'icd_mixte', 'D2', 0));
    const card = await getPlayerCard(db, { licence: LICENCE, seasonCode: SEASON });
    expect(card.teams).toEqual([]);
  });

  it('lit les classements à la date d’import la plus récente', async () => {
    await rank('2025-09-01', 'D8', 'D9', 'P10');
    await rank('2026-01-15', 'D7', 'D8', 'D9');

    const card = await getPlayerCard(db, { licence: LICENCE, seasonCode: SEASON });

    expect(card.referenceEloDate).toBe('2026-01-15');
    expect(card.rankings).toMatchObject({ singles: 'D7', doubles: 'D8', mixed: 'D9', hasRanking: true });
  });

  /**
   * Sans ligne de classement : licencié non compétiteur. `NC` en est l'exact contraire
   * — un compétiteur classé zéro point — et la fiche ne doit pas les confondre.
   */
  it('distingue « aucun classement » de « NC »', async () => {
    const absent = await getPlayerCard(db, { licence: LICENCE, seasonCode: SEASON });
    expect(absent.rankings.hasRanking).toBe(false);
    expect(absent.referenceEloDate).toBeNull();

    await rank('2026-01-15', 'NC', null, null);
    const nc = await getPlayerCard(db, { licence: LICENCE, seasonCode: SEASON });
    expect(nc.rankings.hasRanking).toBe(true);
    expect(nc.rankings.singles).toBe('NC');
    expect(nc.rankings.doubles).toBeNull();
  });
});
