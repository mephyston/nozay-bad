import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { membersTable } from '@nba/members/schema';
import { listDayValues } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { saveLineup } from '../save-lineup/handler';
import { playerRankingsTable } from '../shared/schema';
import type { SaveLineupSlot } from '../save-lineup/dto';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const ELO = '2026-10-08';

describe('contrôle des valeurs par journée', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${SEASON}`))!.id;
    for (const c of ['icd_mixte', 'icd_masculin']) {
      await db.run(sql`
        INSERT INTO championship_settings (season_code, championship, reference_elo_date, updated_at)
        VALUES (${SEASON}, ${c}, ${ELO}, 0)
      `);
    }
  });

  async function player(licence: string, gender: 'M' | 'F', ranking: string) {
    await db.insert(membersTable).values({
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender, birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW
    });
    await db.insert(playerRankingsTable).values({
      licence, eloDate: ELO, seasonCode: SEASON, lastName: `N${licence}`, firstName: 'Test',
      gender: gender === 'M' ? 'H' : 'F', category: 'Senior', mutation: 'none',
      singles: ranking as never, doubles: ranking as never, mixed: ranking as never,
      singlesRank: null, doublesRank: null, mixedRank: null,
      cpphSingles: null, cpphDoubles: null, cpphMixed: null,
      source: 'import', updatedAt: NOW
    });
  }

  /** Sept lignes à partir de six hommes et quatre femmes. */
  function lines(men: string[], women: string[]): SaveLineupSlot[] {
    return [
      { discipline: 'SH', position: 1, licence1: men[0] },
      { discipline: 'SH', position: 2, licence1: men[1] },
      { discipline: 'SH', position: 3, licence1: men[2] },
      { discipline: 'SD', position: 1, licence1: women[0] },
      { discipline: 'DH', position: 1, licence1: men[3], licence2: men[4] },
      { discipline: 'DD', position: 1, licence1: women[1], licence2: women[2] },
      { discipline: 'MX', position: 1, licence1: men[5], licence2: women[3] }
    ];
  }

  const menA = ['10000001', '10000002', '10000003', '10000004', '10000005', '10000006'];
  const womenA = ['10000011', '10000012', '10000013', '10000014'];
  const menB = ['20000001', '20000002', '20000003', '20000004', '20000005', '20000006'];
  const womenB = ['20000011', '20000012', '20000013', '20000014'];

  async function seed(rankA: string, rankB: string) {
    for (const l of menA) await player(l, 'M', rankA);
    for (const l of womenA) await player(l, 'F', rankA);
    for (const l of menB) await player(l, 'M', rankB);
    for (const l of womenB) await player(l, 'F', rankB);

    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-11-02' }] },
      NOW
    );

    const one = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    const two = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 }, NOW);
    await saveTeamStaff(db, { teamId: one.id, captainLicence: menA[0], viceCaptainLicence: null }, NOW);
    await saveTeamStaff(db, { teamId: two.id, captainLicence: menB[0], viceCaptainLicence: null }, NOW);
    return { one, two };
  }

  it('classe les équipes par numéro, dans l’ordre où la hiérarchie se lit', async () => {
    const { one, two } = await seed('D7', 'D9');
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: menA[0], lines: lines(menA, womenA) }, NOW);
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: menB[0], lines: lines(menB, womenB) }, NOW);

    const board = await listDayValues(db, { seasonCode: SEASON, championship: 'icd_mixte', dayNumber: 1 });

    expect(board.teams.map((t) => t.name)).toEqual(['NBA91-1', 'NBA91-2']);
    expect(board.hasTeamValue).toBe(true);
  });

  it('signale l’équipe 2 quand elle dépasse l’équipe 1', async () => {
    // Équipe 1 en D9 (4 points), équipe 2 en D7 (6 points) : l'inverse de la hiérarchie.
    const { one, two } = await seed('D9', 'D7');
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: menA[0], lines: lines(menA, womenA) }, NOW);
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: menB[0], lines: lines(menB, womenB) }, NOW);

    const board = await listDayValues(db, { seasonCode: SEASON, championship: 'icd_mixte', dayNumber: 1 });
    const second = board.teams.find((t) => t.number === 2)!;

    expect(second.value).toBe(6);
    expect(second.upperTeamValue).toBe(4);
    expect(second.delta).toBe(2);
    expect(second.conform).toBe(false);
  });

  it('déclare conforme une équipe 2 restée sous l’équipe 1', async () => {
    const { one, two } = await seed('D7', 'D9');
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: menA[0], lines: lines(menA, womenA) }, NOW);
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: menB[0], lines: lines(menB, womenB) }, NOW);

    const second = (
      await listDayValues(db, { seasonCode: SEASON, championship: 'icd_mixte', dayNumber: 1 })
    ).teams.find((t) => t.number === 2)!;

    expect(second.delta).toBe(-2);
    expect(second.conform).toBe(true);
  });

  it('ne conclut rien quand l’équipe du dessus n’a pas composé', async () => {
    const { two } = await seed('D7', 'D9');
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: menB[0], lines: lines(menB, womenB) }, NOW);

    const second = (
      await listDayValues(db, { seasonCode: SEASON, championship: 'icd_mixte', dayNumber: 1 })
    ).teams.find((t) => t.number === 2)!;

    // `null` n'est pas un feu vert : c'est une absence de réponse.
    expect(second.upperTeamValue).toBeNull();
    expect(second.conform).toBeNull();
  });

  it('remonte l’équipe 1 comme non composée sans la déclarer en faute', async () => {
    const { two } = await seed('D7', 'D9');
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: menB[0], lines: lines(menB, womenB) }, NOW);

    const first = (
      await listDayValues(db, { seasonCode: SEASON, championship: 'icd_mixte', dayNumber: 1 })
    ).teams.find((t) => t.number === 1)!;

    expect(first.filledLines).toBe(0);
    expect(first.value).toBeNull();
  });

  it('n’affiche aucune valeur d’équipe pour les vétérans', async () => {
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_veterans', days: [{ number: 1, weekStart: '2026-11-23' }] },
      NOW
    );
    await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D2', number: 1 }, NOW);

    const board = await listDayValues(db, {
      seasonCode: SEASON, championship: 'icd_veterans', dayNumber: 1
    });

    expect(board.hasTeamValue).toBe(false);
  });

  describe('joueurs alignés deux fois dans la semaine', () => {
    /**
     * Le cas réel : chaque capitaine a composé en toute légalité, puis le calendrier a
     * bougé et les deux journées se sont retrouvées la même semaine. C'est précisément
     * ce que seul le coach peut voir — chaque capitaine, lui, avait raison.
     */
    it('les détecte quand un déplacement de calendrier rapproche deux journées', async () => {
      const { one } = await seed('D7', 'D9');
      await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: menA[0], lines: lines(menA, womenA) }, NOW);

      // Le masculin joue d'abord une AUTRE semaine : aligner le même joueur y est permis.
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_masculin', days: [{ number: 1, weekStart: '2026-11-16' }] },
        NOW
      );
      const masc = await saveTeam(
        db, { seasonCode: SEASON, championship: 'icd_masculin', division: 'D1', number: 1 }, NOW
      );
      await saveTeamStaff(db, { teamId: masc.id, captainLicence: menA[0], viceCaptainLicence: null }, NOW);
      await saveLineup(
        db,
        {
          teamId: masc.id, dayNumber: 1, licence: menA[0],
          lines: [{ discipline: 'SH', position: 1, licence1: menA[0] }]
        },
        NOW
      );

      // Le comité déplace la journée masculine sur la semaine du mixte.
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_masculin', days: [{ number: 1, weekStart: '2026-11-02' }] },
        NOW
      );

      const board = await listDayValues(db, {
        seasonCode: SEASON, championship: 'icd_mixte', dayNumber: 1
      });

      expect(board.duplicatePlayers).toHaveLength(1);
      expect(board.duplicatePlayers[0].licence).toBe(menA[0]);
      expect(board.duplicatePlayers[0].teams).toHaveLength(2);
    });

    it('ne signale rien quand chacun ne tient qu’une équipe', async () => {
      const { one, two } = await seed('D7', 'D9');
      await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: menA[0], lines: lines(menA, womenA) }, NOW);
      await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: menB[0], lines: lines(menB, womenB) }, NOW);

      const board = await listDayValues(db, {
        seasonCode: SEASON, championship: 'icd_mixte', dayNumber: 1
      });

      expect(board.duplicatePlayers).toEqual([]);
    });
  });
});
