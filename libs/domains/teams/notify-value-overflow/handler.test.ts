import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { pushMessagesTable } from '@nba/notifications/schema';
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

describe('constat automatique de dépassement de valeur', () => {
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
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-11-02' }] },
      NOW
    );
  });

  async function player(licence: string, gender: 'M' | 'F', ranking: string) {
    await insertMemberFixture(db, {
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender, birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW, email: `${licence}@club.fr`
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

  /** Équipe 1 faible (D9), équipe 2 forte (D7) : la 2 dépasse la 1. */
  async function seedPlayersAndTeams() {
    const mA = men('1'), wA = women('1'), mB = men('2'), wB = women('2');
    for (const l of mA) await player(l, 'M', 'D9');
    for (const l of wA) await player(l, 'F', 'D9');
    for (const l of mB) await player(l, 'M', 'D7');
    for (const l of wB) await player(l, 'F', 'D7');

    const one = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    const two = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 }, NOW);
    await saveTeamStaff(db, { teamId: one.id, captainLicence: mA[0], viceCaptainLicence: null }, NOW);
    await saveTeamStaff(db, { teamId: two.id, captainLicence: mB[0], viceCaptainLicence: mB[1] }, NOW);
    return { one, two, mA, wA, mB, wB };
  }

  async function overflowMessages() {
    const messages = await db.select().from(pushMessagesTable).all();
    return messages.filter((m) => m.source.startsWith('teams:value-overflow:'));
  }

  it('valider une composition qui dépasse l’équipe du dessus prévient les deux staffs', async () => {
    const { one, two, mA, wA, mB, wB } = await seedPlayersAndTeams();
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA), validate: true }, NOW);

    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: mB[0], lines: lines(mB, wB), validate: true }, NOW);

    const overflow = await overflowMessages();
    expect(overflow).toHaveLength(2);
    const own = overflow.find((m) => m.source === `teams:value-overflow:${two.id}:J1:1`)!;
    const upper = overflow.find((m) => m.source === `teams:value-overflow:${two.id}:J1:1:upper`)!;
    expect(own.title).toContain('NBA91-2');
    expect(own.body).toContain('NBA91-1');
    expect(upper.title).toContain('NBA91-1');
    expect(upper.url).toContain(`/equipes/${one.id}/journee/1`);
  });

  it('valider une équipe du dessus affaiblie détecte le dépassement du dessous déjà validé', async () => {
    const { one, two, mA, wA, mB, wB } = await seedPlayersAndTeams();
    // Le dessous (équipe 2, forte) valide en premier : à cet instant l'équipe 1 n'a
    // rien saisi, aucun plafond, donc aucun constat.
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: mB[0], lines: lines(mB, wB), validate: true }, NOW);
    expect(await overflowMessages()).toHaveLength(0);

    // L'équipe 1 valide une composition faible : le dépassement naît de son côté.
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA), validate: true }, NOW);

    const overflow = await overflowMessages();
    expect(overflow).toHaveLength(2);
    expect(overflow.map((m) => m.source).sort()).toEqual(
      [`teams:value-overflow:${two.id}:J1:1`, `teams:value-overflow:${two.id}:J1:1:upper`].sort()
    );
  });

  it('un brouillon du dessous ne déclenche rien', async () => {
    const { one, two, mA, wA, mB, wB } = await seedPlayersAndTeams();
    // Brouillon fort en équipe 2, pas validé.
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: mB[0], lines: lines(mB, wB) }, NOW);

    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA), validate: true }, NOW);

    expect(await overflowMessages()).toHaveLength(0);
  });

  it('une revalidation rapprochée est absorbée par la dédup', async () => {
    const { one, two, mA, wA, mB, wB } = await seedPlayersAndTeams();
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA), validate: true }, NOW);
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: mB[0], lines: lines(mB, wB), validate: true }, NOW);
    expect(await overflowMessages()).toHaveLength(2);

    // Deux heures plus tard, le capitaine revalide sans corriger : pas de rafale.
    await saveLineup(
      db,
      { teamId: two.id, dayNumber: 1, licence: mB[0], lines: lines(mB, wB), validate: true },
      new Date(NOW.getTime() + 2 * 60 * 60 * 1000)
    );
    expect(await overflowMessages()).toHaveLength(2);
  });

  it('valider une composition saine n’envoie aucun constat', async () => {
    const { one, mA, wA } = await seedPlayersAndTeams();
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA), validate: true }, NOW);

    expect(await overflowMessages()).toHaveLength(0);
  });
});
