import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { membersTable } from '@nba/members/schema';
import { saveTeam } from './handler';
import { listTeams } from '../list-teams/handler';
import { getTeam } from '../get-team/handler';
import { deleteTeam } from '../delete-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveTeamRoster } from '../save-team-roster/handler';
import { playerRankingsTable } from '../shared/schema';
import {
  InvalidLineupError,
  TeamNotFoundError,
  TeamNumberTakenError,
  UnknownChampionshipError
} from '../shared/errors';

const NOW = new Date('2026-09-01T10:00:00Z');
const SEASON = '26-27';

describe('équipes du club', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    // `seasons` appartient au domaine comptable : fixture en SQL brut, pour ne pas
    // ouvrir une dépendance que le domaine n'a pas.
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${SEASON}`))!.id;
  });

  async function member(licence: string, lastName: string, gender: 'M' | 'F' = 'M') {
    await db.insert(membersTable).values({
      licence,
      seasonId,
      lastName,
      firstName: 'Test',
      gender,
      birthDate: '1985-01-01',
      type: 'Adulte',
      importedAt: NOW
    });
  }

  const base = { seasonCode: SEASON, championship: 'icd_mixte' as const, division: 'D2' };

  it('nomme l’équipe d’après son numéro, sans le demander', async () => {
    const team = await saveTeam(db, { ...base, number: 3 }, NOW);

    expect(team.name).toBe('NBA91-3');
  });

  it('refuse une division qui n’existe pas dans ce championnat', async () => {
    // La D4 « Promotion » est masculine : elle n'a pas de sens en mixte.
    await expect(saveTeam(db, { ...base, division: 'R1', number: 1 }, NOW)).rejects.toBeInstanceOf(
      UnknownChampionshipError
    );
  });

  it('refuse deux équipes du même numéro dans un championnat', async () => {
    await saveTeam(db, { ...base, number: 1 }, NOW);

    await expect(saveTeam(db, { ...base, number: 1 }, NOW)).rejects.toBeInstanceOf(
      TeamNumberTakenError
    );
  });

  it('autorise le même numéro dans deux championnats différents', async () => {
    // NBA91-1 en mixte et NBA91-1 en masculin sont deux équipes distinctes.
    await saveTeam(db, { ...base, number: 1 }, NOW);
    const masculine = await saveTeam(
      db,
      { seasonCode: SEASON, championship: 'icd_masculin', division: 'D2', number: 1 },
      NOW
    );

    expect(masculine.name).toBe('NBA91-1');
  });

  it('modifie une équipe sans se heurter à son propre numéro', async () => {
    const team = await saveTeam(db, { ...base, number: 2 }, NOW);
    const updated = await saveTeam(db, { ...base, id: team.id, number: 2, poolLabel: 'A' }, NOW);

    expect(updated.id).toBe(team.id);
  });

  it('trie les équipes par championnat puis par numéro, comme se lit la hiérarchie', async () => {
    await saveTeam(db, { ...base, number: 3 }, NOW);
    await saveTeam(db, { ...base, number: 1 }, NOW);
    await saveTeam(db, { seasonCode: SEASON, championship: 'icr_seniors', division: 'R2', number: 1 }, NOW);

    const { teams } = await listTeams(db, SEASON);

    expect(teams.map((t) => `${t.championship}-${t.number}`)).toEqual([
      'icr_seniors-1',
      'icd_mixte-1',
      'icd_mixte-3'
    ]);
  });

  it('rappelle le format de rencontre de la division', async () => {
    await saveTeam(db, { ...base, division: 'D1', number: 1 }, NOW);
    const [d1] = (await listTeams(db, SEASON)).teams;

    // Division 1 du mixte : 8 matchs. À partir de la D2 : 7.
    expect(d1.matchCount).toBe(8);
  });

  describe('staff', () => {
    it('résout le capitaine et le vice-capitaine depuis le référentiel', async () => {
      await member('00000001', 'DUPONT');
      await member('00000002', 'MARTIN', 'F');
      const team = await saveTeam(db, { ...base, number: 1 }, NOW);

      await saveTeamStaff(
        db,
        { teamId: team.id, captainLicence: '00000001', viceCaptainLicence: '00000002' },
        NOW
      );

      const detail = await getTeam(db, team.id);
      expect(detail.captain?.lastName).toBe('DUPONT');
      expect(detail.viceCaptain?.lastName).toBe('MARTIN');
    });

    it('refuse la même personne aux deux rôles', async () => {
      await member('00000001', 'DUPONT');
      const team = await saveTeam(db, { ...base, number: 1 }, NOW);

      await expect(
        saveTeamStaff(
          db,
          { teamId: team.id, captainLicence: '00000001', viceCaptainLicence: '00000001' },
          NOW
        )
      ).rejects.toBeInstanceOf(InvalidLineupError);
    });

    it('refuse une licence absente du référentiel : ce serait un droit accordé à personne', async () => {
      const team = await saveTeam(db, { ...base, number: 1 }, NOW);

      await expect(
        saveTeamStaff(db, { teamId: team.id, captainLicence: '09999999', viceCaptainLicence: null }, NOW)
      ).rejects.toBeInstanceOf(InvalidLineupError);
    });

    it('retire une désignation avec null', async () => {
      await member('00000001', 'DUPONT');
      const team = await saveTeam(db, { ...base, number: 1 }, NOW);
      await saveTeamStaff(db, { teamId: team.id, captainLicence: '00000001', viceCaptainLicence: null }, NOW);

      await saveTeamStaff(db, { teamId: team.id, captainLicence: null, viceCaptainLicence: null }, NOW);

      expect((await getTeam(db, team.id)).captain).toBeNull();
    });
  });

  describe('effectif', () => {
    it('écarte les licences inconnues sans perdre la saisie', async () => {
      await member('00000001', 'DUPONT');
      await member('00000002', 'MARTIN');
      const team = await saveTeam(db, { ...base, number: 1 }, NOW);

      const result = await saveTeamRoster(
        db,
        { teamId: team.id, licences: ['00000001', '00000002', '09999999'] },
        NOW
      );

      expect(result.count).toBe(2);
      expect(result.rejected).toEqual(['09999999']);
    });

    it('tolère un doublon dans la sélection', async () => {
      await member('00000001', 'DUPONT');
      const team = await saveTeam(db, { ...base, number: 1 }, NOW);

      const result = await saveTeamRoster(
        db,
        { teamId: team.id, licences: ['00000001', '00000001'] },
        NOW
      );

      expect(result.count).toBe(1);
    });

    it('remplace l’effectif plutôt que de l’enrichir', async () => {
      await member('00000001', 'DUPONT');
      await member('00000002', 'MARTIN');
      const team = await saveTeam(db, { ...base, number: 1 }, NOW);

      await saveTeamRoster(db, { teamId: team.id, licences: ['00000001', '00000002'] }, NOW);
      await saveTeamRoster(db, { teamId: team.id, licences: ['00000002'] }, NOW);

      expect((await listTeams(db, SEASON)).teams[0].rosterCount).toBe(1);
    });
  });

  describe('équipes du lecteur', () => {
    /**
     * Ce marquage porte la mise en avant de « mes équipes » sur l'espace adhérent : sans
     * lui, la liste du club est un mur d'équipes identiques.
     */
    it('dit à chacun ce qu’il est dans chaque équipe, sans filtrer la liste', async () => {
      await member('00000001', 'CAPITAINE');
      await member('00000002', 'JOUEUR');

      const mine = await saveTeam(db, { ...base, number: 1 }, NOW);
      const other = await saveTeam(db, { ...base, number: 2 }, NOW);

      await saveTeamStaff(db, { teamId: mine.id, captainLicence: '00000001', viceCaptainLicence: null }, NOW);
      await saveTeamRoster(db, { teamId: other.id, licences: ['00000002'] }, NOW);

      const captainView = await listTeams(db, SEASON, '00000001');
      expect(captainView.teams.map((t) => t.viewerRole)).toEqual(['captain', null]);

      const playerView = await listTeams(db, SEASON, '00000002');
      expect(playerView.teams.map((t) => t.viewerRole)).toEqual([null, 'player']);
    });

    it('reste le capitaine de son équipe même inscrit à son propre effectif', async () => {
      await member('00000001', 'CAPITAINE');

      const team = await saveTeam(db, { ...base, number: 1 }, NOW);
      await saveTeamStaff(db, { teamId: team.id, captainLicence: '00000001', viceCaptainLicence: null }, NOW);
      await saveTeamRoster(db, { teamId: team.id, licences: ['00000001'] }, NOW);

      expect((await listTeams(db, SEASON, '00000001')).teams[0].viewerRole).toBe('captain');
    });

    it('ne marque rien quand la liste n’est celle de personne', async () => {
      await member('00000001', 'CAPITAINE');

      const team = await saveTeam(db, { ...base, number: 1 }, NOW);
      await saveTeamStaff(db, { teamId: team.id, captainLicence: '00000001', viceCaptainLicence: null }, NOW);

      expect((await listTeams(db, SEASON)).teams[0].viewerRole).toBeNull();
    });
  });

  describe('détail et éligibilité', () => {
    it("juge chaque joueur au regard de la division, à la date de référence", async () => {
      await member('00000001', 'FORT');
      await member('00000002', 'MOYEN');

      await db.insert(playerRankingsTable).values([
        {
          licence: '00000001', eloDate: '2026-08-13', seasonCode: SEASON, lastName: 'FORT',
          firstName: 'Test', gender: 'H', category: 'Senior', mutation: 'none',
          singles: 'R6', doubles: 'R6', mixed: 'R6',
          singlesRank: null, doublesRank: null, mixedRank: null,
          cpphSingles: null, cpphDoubles: null, cpphMixed: null, source: 'import', updatedAt: NOW
        },
        {
          licence: '00000002', eloDate: '2026-08-13', seasonCode: SEASON, lastName: 'MOYEN',
          firstName: 'Test', gender: 'H', category: 'Senior', mutation: 'none',
          singles: 'D8', doubles: 'D8', mixed: 'D8',
          singlesRank: null, doublesRank: null, mixedRank: null,
          cpphSingles: null, cpphDoubles: null, cpphMixed: null, source: 'import', updatedAt: NOW
        }
      ]);

      await db.run(sql`
        INSERT INTO championship_settings (season_code, championship, reference_elo_date, updated_at)
        VALUES (${SEASON}, 'icd_masculin', '2026-08-13', 0)
      `);

      // Masculin D2 : au mieux D7 dans la discipline jouée. R6 est trop fort.
      const team = await saveTeam(
        db,
        { seasonCode: SEASON, championship: 'icd_masculin', division: 'D2', number: 1 },
        NOW
      );
      await saveTeamRoster(db, { teamId: team.id, licences: ['00000001', '00000002'] }, NOW);

      const detail = await getTeam(db, team.id);

      expect(detail.referenceEloDate).toBe('2026-08-13');
      expect(detail.referenceOrigin).toBe('season');
      // Les joueurs à problème remontent en tête.
      expect(detail.roster[0].lastName).toBe('FORT');
      expect(detail.roster[0].eligible).toBe(false);
      expect(detail.roster[1].eligible).toBe(true);
    });

    it('signale que la référence du régional dépend de la journée', async () => {
      await db.insert(playerRankingsTable).values({
        licence: '00000001', eloDate: '2026-08-13', seasonCode: SEASON, lastName: 'X',
        firstName: 'Y', gender: 'H', category: 'Senior', mutation: 'none',
        singles: 'R6', doubles: 'R6', mixed: 'R6',
        singlesRank: null, doublesRank: null, mixedRank: null,
        cpphSingles: null, cpphDoubles: null, cpphMixed: null, source: 'import', updatedAt: NOW
      });

      const team = await saveTeam(
        db,
        { seasonCode: SEASON, championship: 'icr_seniors', division: 'R2', number: 1 },
        NOW
      );

      expect((await getTeam(db, team.id)).referenceOrigin).toBe('latest');
    });
  });

  it('supprime une équipe et tout ce qui en dépend', async () => {
    await member('00000001', 'DUPONT');
    const team = await saveTeam(db, { ...base, number: 1 }, NOW);
    await saveTeamStaff(db, { teamId: team.id, captainLicence: '00000001', viceCaptainLicence: null }, NOW);

    await deleteTeam(db, team.id);

    expect((await listTeams(db, SEASON)).teams).toHaveLength(0);
    await expect(getTeam(db, team.id)).rejects.toBeInstanceOf(TeamNotFoundError);
  });
});
