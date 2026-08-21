import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { pushMessagesTable } from '@nba/notifications/schema';
import { notifyCaptain } from './handler';
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

describe('prévenir le capitaine', () => {
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

  async function player(licence: string, gender: 'M' | 'F', ranking: string, email: string | null = null) {
    await insertMemberFixture(db, {
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender, birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW, email
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

  /**
   * Licences sur **huit caractères**, comme partout dans le domaine.
   *
   * Le code les normalise à l'écriture : une fixture plus courte se retrouve stockée
   * padée dans la composition mais brute dans les classements, et la jointure échoue en
   * silence — la valeur devient incalculable, et l'infraction cherchée disparaît.
   */
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

  /** Équipe 1 faible, équipe 2 forte : l'équipe 2 enfreint la hiérarchie. */
  async function seedBreach() {
    const mA = men('1'), wA = women('1'), mB = men('2'), wB = women('2');
    for (const l of mA) await player(l, 'M', 'D9');
    for (const l of wA) await player(l, 'F', 'D9');
    for (const l of mB) await player(l, 'M', 'D7', `${l}@club.fr`);
    for (const l of wB) await player(l, 'F', 'D7');

    const one = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    const two = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 }, NOW);
    await saveTeamStaff(db, { teamId: one.id, captainLicence: mA[0], viceCaptainLicence: null }, NOW);
    await saveTeamStaff(db, { teamId: two.id, captainLicence: mB[0], viceCaptainLicence: mB[1] }, NOW);

    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA) }, NOW);
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: mB[0], lines: lines(mB, wB) }, NOW);
    return { one, two };
  }

  it('met en file un message décrivant l’infraction constatée', async () => {
    const { two } = await seedBreach();

    const result = await notifyCaptain(db, { teamId: two.id, dayNumber: 1 }, NOW);

    expect(result.skipped).toBe(false);
    expect(result.title).toContain('NBA91-2');
    expect(result.body).toContain('NBA91-1');

    const [message] = await db.select().from(pushMessagesTable).all();
    expect(message.category).toBe('interclubs');
    // Le lien mène droit à la composition en cause.
    expect(message.url).toContain(`/equipes/${two.id}/journee/1`);
  });

  it('prévient le vice-capitaine avec le capitaine : il supplée, encore faut-il qu’il sache', async () => {
    const { two } = await seedBreach();

    const result = await notifyCaptain(db, { teamId: two.id, dayNumber: 1 }, NOW);

    expect(result.recipients).toBe(2);
  });

  it('prévient aussi l’équipe du dessus et met les deux capitaines en relation', async () => {
    const { one, two } = await seedBreach();
    // Le capitaine de l'équipe 1 est joignable : le dépassement le concerne autant.
    await db.run(sql`UPDATE persons SET email = 'cap1@club.fr' WHERE licence = ${men('1')[0]}`);

    const result = await notifyCaptain(db, { teamId: two.id, dayNumber: 1 }, NOW);

    expect(result.counterpartTeamName).toBe('NBA91-1');
    expect(result.counterpartRecipients).toBe(1);

    const messages = await db.select().from(pushMessagesTable).all();
    const toUpper = messages.find((m) => m.title.includes('NBA91-1'))!;
    // Chaque message nomme l'autre équipe : la correction peut venir des deux côtés.
    expect(toUpper.body).toContain('NBA91-2');
    expect(result.body).toContain('NBA91-1');
    expect(toUpper.url).toContain(`/equipes/${one.id}/journee/1`);
  });

  it('ne dérange pas l’équipe du dessus pour une erreur qui ne la regarde pas', async () => {
    // Hiérarchie saine cette fois : l'équipe 1 est la plus forte.
    const mA = men('1'), wA = women('1'), mB = men('2'), wB = women('2');
    for (const l of mA) await player(l, 'M', 'D7', `${l}@club.fr`);
    for (const l of wA) await player(l, 'F', 'D7');
    for (const l of mB) await player(l, 'M', 'D9', `${l}@club.fr`);
    for (const l of wB) await player(l, 'F', 'D9');

    const one = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW);
    const two = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 }, NOW);
    await saveTeamStaff(db, { teamId: one.id, captainLicence: mA[0], viceCaptainLicence: null }, NOW);
    await saveTeamStaff(db, { teamId: two.id, captainLicence: mB[0], viceCaptainLicence: null }, NOW);
    await saveLineup(db, { teamId: one.id, dayNumber: 1, licence: mA[0], lines: lines(mA, wA) }, NOW);
    await saveLineup(db, { teamId: two.id, dayNumber: 1, licence: mB[0], lines: lines(mB, wB) }, NOW);

    // Un joueur de l'équipe 1 se retrouve aligné en 2 : erreur dure (art. 6.3.7), mais la
    // hiérarchie de valeur reste respectée. L'équipe du dessus n'a rien à arbitrer.
    await db.run(sql`
      UPDATE lineup_slots SET licence1 = ${mA[0]}
      WHERE discipline = 'SH' AND position = 1
        AND fixture_id IN (SELECT id FROM team_fixtures WHERE team_id = ${two.id})
    `);

    const result = await notifyCaptain(db, { teamId: two.id, dayNumber: 1 }, NOW);

    expect(result.skipped).toBe(false);
    expect(result.counterpartTeamName).toBeNull();
    expect(result.counterpartRecipients).toBe(0);
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(1);
  });

  it('n’envoie rien quand la composition est saine', async () => {
    const { one } = await seedBreach();

    // L'équipe 1 n'a personne au-dessus d'elle : aucune anomalie à signaler.
    const result = await notifyCaptain(db, { teamId: one.id, dayNumber: 1 }, NOW);

    expect(result.skipped).toBe(true);
    expect(result.recipients).toBe(0);
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(0);
  });

  it('reprend le mot du coach quand il en ajoute un', async () => {
    const { two } = await seedBreach();

    const result = await notifyCaptain(
      db, { teamId: two.id, dayNumber: 1, note: 'Merci de revoir avant vendredi.' }, NOW
    );

    expect(result.body).toContain('Merci de revoir avant vendredi.');
  });

  it('n’échoue pas quand le staff n’a aucune adresse connue', async () => {
    const { two } = await seedBreach();
    // On efface les adresses : l'envoi doit rester sans effet, pas lever.
    await db.run(sql`UPDATE persons SET email = NULL`);

    const result = await notifyCaptain(db, { teamId: two.id, dayNumber: 1 }, NOW);

    expect(result.recipients).toBe(0);
    expect(result.skipped).toBe(false);
  });
});
