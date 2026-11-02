import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { publishRosters } from './handler';
import { saveChampionshipSettings } from '../save-championship-settings/handler';
import { listChampionshipSettings } from '../list-championship-settings/handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamStaff } from '../save-team-staff/handler';
import { saveTeamRoster } from '../save-team-roster/handler';
import { listTeams } from '../list-teams/handler';
import { getTeam } from '../get-team/handler';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { sql } from 'drizzle-orm';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';
const CAPTAIN = '10000001';
const PLAYER = '10000002';

describe('publication des effectifs', () => {
  let db: Db;
  let teamId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'S', '2026-09-01', '2027-08-31', 1, 0)
    `);
    const seasonId = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code=${SEASON}`))!.id;
    for (const licence of [CAPTAIN, PLAYER]) {
      await insertMemberFixture(db, {
        licence, seasonId, lastName: `N${licence}`, firstName: 'Test',
        gender: 'M', birthDate: '1990-01-01', type: 'Adulte', importedAt: NOW
      });
    }
    teamId = (await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 }, NOW)).id;
    await saveTeamStaff(db, { teamId, captainLicence: CAPTAIN, viceCaptainLicence: null }, NOW);
    await saveTeamRoster(db, { teamId, licences: [CAPTAIN, PLAYER] }, NOW);
  });

  it('cache aux adhérents effectif et staff tant que le coach fait ses essais', async () => {
    const [listed] = (await listTeams(db, SEASON, PLAYER, 'members')).teams;
    expect(listed.rostersPublished).toBe(false);
    expect(listed.captain).toBeNull();
    expect(listed.rosterCount).toBe(0);
    expect(listed.viewerRole).toBeNull();

    const detail = await getTeam(db, teamId, { audience: 'members', licence: PLAYER });
    expect(detail.roster).toEqual([]);
    expect(detail.captain).toBeNull();
  });

  it('laisse tout voir au bureau, publié ou non', async () => {
    const [listed] = (await listTeams(db, SEASON, null, 'staff')).teams;
    expect(listed.rostersPublished).toBe(false);
    expect(listed.captain?.licence).toBe(CAPTAIN);
    expect(listed.rosterCount).toBe(2);
    expect((await getTeam(db, teamId)).roster).toHaveLength(2);
  });

  it('montre effectif et staff aux adhérents une fois publiés', async () => {
    const result = await publishRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', published: true }, NOW);
    expect(result.rostersPublishedAt).toBe(NOW.toISOString());

    const [listed] = (await listTeams(db, SEASON, PLAYER, 'members')).teams;
    expect(listed.captain?.licence).toBe(CAPTAIN);
    expect(listed.viewerRole).toBe('player');
  });

  it('se retire pour refaire des essais', async () => {
    await publishRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', published: true }, NOW);
    const result = await publishRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', published: false }, NOW);

    expect(result.rostersPublishedAt).toBeNull();
    expect((await listTeams(db, SEASON, PLAYER, 'members')).teams[0].captain).toBeNull();
  });

  it('ne touche pas aux autres réglages du championnat, ni eux à elle', async () => {
    await saveChampionshipSettings(db, { seasonCode: SEASON, championship: 'icd_mixte', referenceEloDate: '2026-10-08' }, NOW);
    await publishRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', published: true }, NOW);
    await saveChampionshipSettings(db, { seasonCode: SEASON, championship: 'icd_mixte', rulesLabel: 'Règlement' }, NOW);

    const mixte = (await listChampionshipSettings(db, SEASON)).items.find((i) => i.championship === 'icd_mixte')!;
    expect(mixte.referenceEloDate).toBe('2026-10-08');
    expect(mixte.rostersPublishedAt).toBe(NOW.toISOString());
  });
});
