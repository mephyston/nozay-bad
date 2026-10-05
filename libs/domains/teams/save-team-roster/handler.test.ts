import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { saveTeamRoster } from './handler';
import { saveTeam } from '../save-team/handler';
import { getTeam } from '../get-team/handler';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
/** Saison 2026-2027 : vétéran = 35 ans au 31 décembre 2026, donc né en 1991 ou avant. */
const VETERAN = '1991-12-31';
const SENIOR = '1992-01-01';

describe("effectif d'une équipe — catégorie d'âge", () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
    seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${SEASON}`))!.id;
    await adherent('10000001', VETERAN);
    await adherent('10000002', SENIOR);
  });

  async function adherent(licence: string, birthDate: string) {
    await insertMemberFixture(db, {
      licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
      gender: 'M', birthDate, type: 'Adulte', importedAt: NOW
    });
  }

  it("n'enrôle que des vétérans dans une équipe vétérans", async () => {
    const team = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D1', number: 1 }, NOW);

    const result = await saveTeamRoster(db, { teamId: team.id, licences: ['10000001', '10000002', '10000099'] }, NOW);

    expect(result.count).toBe(1);
    expect(result.outOfCategory).toEqual(['10000002']);
    expect(result.rejected).toEqual(['10000099']);
    expect((await getTeam(db, team.id)).roster.map((p) => p.licence)).toEqual(['10000001']);
  });

  it("signale à l'écran les adhérents qu'une équipe vétérans n'admet pas", async () => {
    const team = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_veterans', division: 'D1', number: 1 }, NOW);
    expect((await getTeam(db, team.id)).outOfCategoryLicences).toEqual(['10000002']);
  });

  it("laisse un vétéran jouer en seniors : le régional n'écarte aucune catégorie", async () => {
    const team = await saveTeam(db, { seasonCode: SEASON, championship: 'icr_seniors', division: 'R1', number: 1 }, NOW);

    const result = await saveTeamRoster(db, { teamId: team.id, licences: ['10000001', '10000002'] }, NOW);

    expect(result.count).toBe(2);
    expect(result.outOfCategory).toEqual([]);
    expect((await getTeam(db, team.id)).outOfCategoryLicences).toEqual([]);
  });
});
