import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { loadLineup } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveTeamRoster } from '../save-team-roster/handler';
import { saveChampionshipDays } from '../save-championship-days/handler';
import { playerRankingsTable } from '../shared/schema';
import { insertMemberFixture } from '@nba/members/test-fixtures';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
/** Jeudi précédant la semaine du 2026-11-02 : ce que `per_day` calcule pour le régional. */
const ELO = '2026-10-29';

describe('composition — candidats et éligibilité', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${SEASON}`))!.id;
  });

  /** Un adhérent, avec un classement par discipline — `null` = non classé dans celle-ci. */
  async function player(
    licence: string,
    gender: 'M' | 'F',
    rankings: { singles?: string | null; doubles?: string | null; mixed?: string | null } = {},
    eloDate: string = ELO
  ) {
    await insertMemberFixture(db, {
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender, birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW
    });
    await db.insert(playerRankingsTable).values({
      licence, eloDate, seasonCode: SEASON, lastName: `N${licence}`, firstName: 'Test',
      gender: gender === 'M' ? 'H' : 'F', category: 'Senior', mutation: 'none',
      singles: (rankings.singles ?? null) as never,
      doubles: (rankings.doubles ?? null) as never,
      mixed: (rankings.mixed ?? null) as never,
      singlesRank: null, doublesRank: null, mixedRank: null,
      cpphSingles: null, cpphDoubles: null, cpphMixed: null,
      source: 'import', updatedAt: NOW
    });
  }

  /** Une équipe régionale R1 : plancher P10 **dans la discipline jouée** (art. 4.4). */
  async function regionalTeam(roster: string[], captain: string) {
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icr_seniors', days: [{ number: 1, weekStart: '2026-11-02' }] },
      NOW
    );
    const team = await saveTeam(
      db,
      { seasonCode: SEASON, championship: 'icr_seniors', division: 'R1', number: 1 },
      NOW
    );
    await saveTeamStaff(db, { teamId: team.id, captainLicence: captain, viceCaptainLicence: null }, NOW);
    await saveTeamRoster(db, { teamId: team.id, licences: roster }, NOW);
    return team;
  }

  it("ne propose que l'effectif déclaré, jamais tout le club", async () => {
    await player('10000001', 'M', { singles: 'D9', doubles: 'D9', mixed: 'D9' });
    await player('10000002', 'M', { singles: 'D9', doubles: 'D9', mixed: 'D9' });
    // Adhérent de la saison, hors effectif : ne doit pas apparaître.
    await player('10000099', 'M', { singles: 'D9', doubles: 'D9', mixed: 'D9' });

    const team = await regionalTeam(['10000001', '10000002'], '10000001');
    const view = await loadLineup(db, { teamId: team.id, dayNumber: 1 });

    expect(view.candidates.map((c) => c.licence).sort()).toEqual(['10000001', '10000002']);
    expect(view.candidates.every((c) => c.inRoster)).toBe(true);
  });

  it('juge le classement tableau par tableau, et non globalement', async () => {
    // Classé en double, pas en simple : admis en double, refusé en simple.
    await player('10000001', 'M', { singles: null, doubles: 'D9', mixed: null });
    const team = await regionalTeam(['10000001'], '10000001');

    const view = await loadLineup(db, { teamId: team.id, dayNumber: 1 });
    const candidate = view.candidates.find((c) => c.licence === '10000001')!;

    expect(candidate.eligibleDisciplines).toEqual(['doubles']);
    // Alignable quelque part : aucun motif global ne doit l'écarter de toutes les lignes.
    expect(candidate.unavailableReason).toBeNull();
  });

  it("n'écarte de toutes les lignes que le joueur éligible nulle part", async () => {
    await player('10000001', 'M', { singles: null, doubles: null, mixed: null });
    const team = await regionalTeam(['10000001'], '10000001');

    const view = await loadLineup(db, { teamId: team.id, dayNumber: 1 });
    const candidate = view.candidates.find((c) => c.licence === '10000001')!;

    expect(candidate.eligibleDisciplines).toEqual([]);
    expect(candidate.unavailableReason).toBe('Classement hors de cette division');
  });

  /**
   * Le cas qui rendait l'écran muet : le régional lit les cotes d'une mise à jour propre à
   * chaque journée, et aucune n'existait pour la période. Tout l'effectif devenait
   * inéligible sans qu'aucun motif ne soit affiché.
   */
  it('explique pourquoi aucun classement n’est exploitable à la date de référence', async () => {
    // Classement daté bien après la journée : `rankingsUpTo` n'en retiendra aucun.
    await player('10000001', 'M', { singles: 'D9', doubles: 'D9', mixed: 'D9' }, '2027-06-01');
    const team = await regionalTeam(['10000001'], '10000001');

    const view = await loadLineup(db, { teamId: team.id, dayNumber: 1 });

    expect(view.rankingsUnavailableReason).toMatch(/Aucun classement n'est disponible/);
    expect(view.candidates[0].eligibleDisciplines).toEqual([]);
  });

  it('ne signale rien quand les classements sont disponibles', async () => {
    await player('10000001', 'M', { singles: 'D9', doubles: 'D9', mixed: 'D9' });
    const team = await regionalTeam(['10000001'], '10000001');

    const view = await loadLineup(db, { teamId: team.id, dayNumber: 1 });

    expect(view.rankingsUnavailableReason).toBeNull();
  });
});
