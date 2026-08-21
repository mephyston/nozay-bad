import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { pushMessagesTable } from '@nba/notifications/schema';
import { notifyLineup } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveTeamRoster } from '../save-team-roster/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { saveLineup } from '../save-lineup/handler';
import { playerRankingsTable } from '../shared/schema';
import type { SaveLineupSlot } from '../save-lineup/dto';
import { insertMemberFixture } from '@nba/members/test-fixtures';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const ELO = '2026-10-08';

/** Licences sur huit caractères : le domaine les normalise à l'écriture. */
const men = [1, 2, 3, 4, 5, 6].map((i) => `1000000${i}`);
const women = [1, 2, 3, 4].map((i) => `2000000${i}`);
/** Dans l'effectif, mais pas sur la feuille : c'est lui que le silence laissait dans le doute. */
const RESERVE = '30000001';

describe('prévenir l’équipe d’une composition', () => {
  let db: Db;
  let seasonId: number;
  let teamId: number;

  async function player(licence: string, gender: 'M' | 'F') {
    await insertMemberFixture(db, {
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender, birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW,
      email: `${licence}@club.fr`
    });
    await db.insert(playerRankingsTable).values({
      licence, eloDate: ELO, seasonCode: SEASON, lastName: `N${licence}`, firstName: 'Test',
      gender: gender === 'M' ? 'H' : 'F', category: 'Senior', mutation: 'none',
      singles: 'D9', doubles: 'D9', mixed: 'D9',
      singlesRank: null, doublesRank: null, mixedRank: null,
      cpphSingles: null, cpphDoubles: null, cpphMixed: null,
      source: 'import', updatedAt: NOW
    });
  }

  const lines: SaveLineupSlot[] = [
    { discipline: 'SH', position: 1, licence1: men[0] },
    { discipline: 'SH', position: 2, licence1: men[1] },
    { discipline: 'SH', position: 3, licence1: men[2] },
    { discipline: 'SD', position: 1, licence1: women[0] },
    { discipline: 'DH', position: 1, licence1: men[3], licence2: men[4] },
    { discipline: 'DD', position: 1, licence1: women[1], licence2: women[2] },
    { discipline: 'MX', position: 1, licence1: men[5], licence2: women[3] }
  ];

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
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-11-02' }] },
      NOW
    );

    for (const licence of men) await player(licence, 'M');
    for (const licence of women) await player(licence, 'F');
    await player(RESERVE, 'M');

    const team = await saveTeam(
      db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW
    );
    teamId = team.id;
    await saveTeamStaff(db, { teamId, captainLicence: men[0], viceCaptainLicence: null }, NOW);
    await saveTeamRoster(db, { teamId, licences: [...men, ...women, RESERVE] }, NOW);
  });

  const messages = () => db.select().from(pushMessagesTable).all();

  it('ne dit rien tant que la composition n’est qu’un brouillon', async () => {
    await saveLineup(db, { teamId, dayNumber: 1, licence: men[0], lines }, NOW);

    // Un brouillon se construit en plusieurs passes : prévenir à chacune apprendrait à
    // l'équipe à ignorer la notification qui compte.
    expect(await messages()).toHaveLength(0);
  });

  it('prévient les alignés et les non-retenus à la validation', async () => {
    await saveLineup(db, { teamId, dayNumber: 1, licence: men[0], lines, validate: true }, NOW);

    const sent = await messages();
    expect(sent).toHaveLength(2);

    const toSelected = sent.find((m) => m.title.includes('vous jouez'))!;
    const toBenched = sent.find((m) => m.title.includes("pas aligné"))!;
    // La semaine suffit à annoncer : aucune date n'a encore été fixée.
    expect(toSelected.body).toContain('la semaine du 2 novembre');
    expect(toBenched.body).toContain("Vous restez dans l'effectif");
  });

  it('reprévient quand une composition déjà validée est modifiée', async () => {
    await saveLineup(db, { teamId, dayNumber: 1, licence: men[0], lines, validate: true }, NOW);
    const before = (await messages()).length;

    // Le remplaçant entre en jeu : ceux qui s'étaient organisés doivent l'apprendre.
    const changed = lines.map((line) =>
      line.discipline === 'SH' && line.position === 3 ? { ...line, licence1: RESERVE } : line
    );
    await saveLineup(db, { teamId, dayNumber: 1, licence: men[0], lines: changed }, NOW);

    expect((await messages()).length).toBeGreaterThan(before);
  });

  it('n’écrit jamais à l’auteur de la composition', async () => {
    const saved = await saveLineup(db, { teamId, dayNumber: 1, licence: men[0], lines }, NOW);

    const result = await notifyLineup(
      db,
      {
        team: { id: teamId, seasonCode: SEASON },
        lineup: saved,
        authorLicence: men[0],
        validated: true
      },
      NOW
    );

    // 10 joueurs alignés, moins le capitaine qui vient de saisir : il sait déjà.
    expect(result.selected).toBe(9);
    expect(result.benched).toBe(1);
  });
});
