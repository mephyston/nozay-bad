import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveLineup } from './handler';
import { loadLineup } from '../get-lineup/handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { playerRankingsTable } from '../shared/schema';
import { InvalidLineupError, NotTeamCaptainError } from '../shared/errors';
import type { SaveLineupSlot } from './dto';
import { insertMemberFixture } from '@nba/members/test-fixtures';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const ELO = '2026-10-08';

const CAPTAIN = '00000001';

describe('composition d’une rencontre', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${SEASON}`))!.id;
    await db.run(sql`
      INSERT INTO championship_settings (season_code, championship, reference_elo_date, updated_at)
      VALUES (${SEASON}, 'icd_mixte', ${ELO}, 0)
    `);
  });

  /** Un adhérent, avec son classement à la date de référence. */
  async function player(licence: string, gender: 'M' | 'F', ranking: string) {
    await insertMemberFixture(db, {
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender, birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW
    });
    await db.insert(playerRankingsTable).values({
      licence, eloDate: ELO, seasonCode: SEASON,
      lastName: `N${licence}`, firstName: 'Test',
      gender: gender === 'M' ? 'H' : 'F',
      category: 'Senior', mutation: 'none',
      singles: ranking as never, doubles: ranking as never, mixed: ranking as never,
      singlesRank: null, doublesRank: null, mixedRank: null,
      cpphSingles: null, cpphDoubles: null, cpphMixed: null,
      source: 'import', updatedAt: NOW
    });
  }

  const men = ['00000001', '00000002', '00000003', '00000004', '00000005', '00000006'];
  const women = ['00000011', '00000012', '00000013', '00000014'];

  async function setup(opts: { number?: number } = {}) {
    for (const l of men) await player(l, 'M', 'D8');
    for (const l of women) await player(l, 'F', 'D8');

    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-11-02' }] },
      NOW
    );
    const team = await saveTeam(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: opts.number ?? 1 },
      NOW
    );
    await saveTeamStaff(db, { teamId: team.id, captainLicence: CAPTAIN, viceCaptainLicence: null }, NOW);
    return team;
  }

  /** Composition complète et régulière de mixte D2 (7 matchs). */
  function lines(): SaveLineupSlot[] {
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

  it('enregistre une composition régulière et en rend la valeur', async () => {
    const team = await setup();

    const result = await saveLineup(db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, lines: lines() }, NOW);

    expect(result.errors).toEqual([]);
    // Sept lignes à D8 (5 points) : 35 / 7 = 5.
    expect(result.value).toBe(5);
    expect(result.slots.filter((s) => s.licence1)).toHaveLength(7);
  });

  describe('droit d’écrire', () => {
    it('accepte le vice-capitaine', async () => {
      const team = await setup();
      await saveTeamStaff(
        db,
        { teamId: team.id, captainLicence: CAPTAIN, viceCaptainLicence: men[1] },
        NOW
      );

      await expect(
        saveLineup(db, { teamId: team.id, dayNumber: 1, licence: men[1], lines: lines() }, NOW)
      ).resolves.toBeDefined();
    });

    it('refuse un adhérent qui n’est ni capitaine ni vice-capitaine', async () => {
      const team = await setup();

      await expect(
        saveLineup(db, { teamId: team.id, dayNumber: 1, licence: men[2], lines: lines() }, NOW)
      ).rejects.toBeInstanceOf(NotTeamCaptainError);
    });

    it('tient la règle côté serveur, même si l’écran masque le bouton', async () => {
      const team = await setup();
      // `canEdit` sert l'affichage ; le refus, lui, vient du handler.
      const view = await loadLineup(db, { teamId: team.id, dayNumber: 1, viewerLicence: men[2] });
      expect(view.canEdit).toBe(false);
    });
  });

  describe('règles dures', () => {
    it('refuse un joueur aligné trois fois', async () => {
      const team = await setup();
      const bad = lines();
      bad[4] = { discipline: 'DH', position: 1, licence1: men[0], licence2: men[4] };
      bad[6] = { discipline: 'MX', position: 1, licence1: men[0], licence2: women[3] };

      await expect(
        saveLineup(db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, lines: bad }, NOW)
      ).rejects.toBeInstanceOf(InvalidLineupError);
    });

    it('refuse un homme en simple dame', async () => {
      const team = await setup();
      const bad = lines();
      bad[3] = { discipline: 'SD', position: 1, licence1: men[0] };

      await expect(
        saveLineup(db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, lines: bad }, NOW)
      ).rejects.toBeInstanceOf(InvalidLineupError);
    });

    it('n’écrit rien quand la composition est refusée', async () => {
      const team = await setup();
      const bad = lines();
      bad[3] = { discipline: 'SD', position: 1, licence1: men[0] };

      await saveLineup(db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, lines: lines() }, NOW);
      await expect(
        saveLineup(db, { teamId: team.id, dayNumber: 1, licence: CAPTAIN, lines: bad }, NOW)
      ).rejects.toBeInstanceOf(InvalidLineupError);

      // La composition régulière précédente est intacte.
      const view = await loadLineup(db, { teamId: team.id, dayNumber: 1 });
      expect(view.slots.find((s) => s.label === 'SD')!.licence1).toBe(women[0]);
    });
  });

  describe('hiérarchie des valeurs', () => {
    it('avertit sans bloquer quand l’équipe dépasse celle du dessus', async () => {
      // Équipe 1 composée faible, équipe 2 composée forte.
      const first = await setup({ number: 1 });
      await saveTeamStaff(db, { teamId: first.id, captainLicence: CAPTAIN, viceCaptainLicence: null }, NOW);
      await saveLineup(db, { teamId: first.id, dayNumber: 1, licence: CAPTAIN, lines: lines() }, NOW);

      // Une équipe 2, avec des joueurs mieux classés.
      for (const l of ['00000021', '00000022', '00000023', '00000024', '00000025', '00000026']) {
        await player(l, 'M', 'D7');
      }
      for (const l of ['00000031', '00000032', '00000033', '00000034']) await player(l, 'F', 'D7');

      const second = await saveTeam(
        db,
        { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 },
        NOW
      );
      await saveTeamStaff(db, { teamId: second.id, captainLicence: '00000021', viceCaptainLicence: null }, NOW);

      const strong: SaveLineupSlot[] = [
        { discipline: 'SH', position: 1, licence1: '00000022' },
        { discipline: 'SH', position: 2, licence1: '00000023' },
        { discipline: 'SH', position: 3, licence1: '00000024' },
        { discipline: 'SD', position: 1, licence1: '00000031' },
        { discipline: 'DH', position: 1, licence1: '00000025', licence2: '00000026' },
        { discipline: 'DD', position: 1, licence1: '00000032', licence2: '00000033' },
        { discipline: 'MX', position: 1, licence1: '00000021', licence2: '00000034' }
      ];

      const result = await saveLineup(
        db,
        { teamId: second.id, dayNumber: 1, licence: '00000021', lines: strong },
        NOW
      );

      // Enregistrée malgré l'infraction : l'équipe 1 peut encore changer sa composition.
      expect(result.value).toBe(6);
      expect(result.upperTeamValue).toBe(5);
      expect(result.warnings.map((w) => w.code)).toContain('W1');
    });
  });

  describe('un joueur, une seule équipe par semaine', () => {
    it('refuse un joueur déjà aligné dans une autre équipe du club cette semaine', async () => {
      const first = await setup({ number: 1 });
      await saveLineup(db, { teamId: first.id, dayNumber: 1, licence: CAPTAIN, lines: lines() }, NOW);

      // Le masculin joue la même semaine : la J1 des deux championnats est la même semaine.
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_masculin', days: [{ number: 1, weekStart: '2026-11-02' }] },
        NOW
      );
      const masc = await saveTeam(
        db,
        { seasonCode: SEASON, championship: 'icd_masculin', division: 'D1', number: 1 },
        NOW
      );
      await saveTeamStaff(db, { teamId: masc.id, captainLicence: men[1], viceCaptainLicence: null }, NOW);

      const reused: SaveLineupSlot[] = [
        { discipline: 'SH', position: 1, licence1: men[0] }, // déjà en mixte
        { discipline: 'SH', position: 2, licence1: men[1] }
      ];

      await expect(
        saveLineup(db, { teamId: masc.id, dayNumber: 1, licence: men[1], lines: reused }, NOW)
      ).rejects.toThrow(/semaine/);
    });
  });
});
