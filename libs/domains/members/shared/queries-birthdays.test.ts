import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { seasonsTable } from '@nba/accounting/schema';
import { insertMemberFixture } from './test-fixtures';
import { getBirthdaysForActiveSeason } from './queries';

/**
 * Qui est fêté : les adhérents de la saison active, quel que soit l'état de leur
 * règlement — et eux seuls. Même source pour l'encart de l'accueil et l'annonce du matin.
 */

const NOW = new Date('2026-03-14T10:00:00Z');
const DAY = new Date('2026-09-08T07:00:00Z');

let db: Db;

beforeEach(async () => {
  ({ db } = await setupMockDb());
  await db.insert(seasonsTable).values([
    { id: 1, code: '25-26', name: '2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: false, createdAt: NOW },
    { id: 2, code: '26-27', name: '2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: true, createdAt: NOW }
  ]);
});

const names = async () => (await getBirthdaysForActiveSeason(db, DAY)).map((b) => `${b.firstName} ${b.age}`).sort();

describe('getBirthdaysForActiveSeason', () => {
  it('fête les adhérents de la saison active, réglés ou non', async () => {
    await insertMemberFixture(db, { licence: '00000001', seasonId: 2, firstName: 'Léa', birthDate: '1990-09-08', status: 'valide' });
    await insertMemberFixture(db, { licence: '00000002', seasonId: 2, firstName: 'Tom', birthDate: '2012-09-08', status: 'incomplet' });
    await insertMemberFixture(db, { licence: '00000003', seasonId: 2, firstName: 'Zoé', birthDate: '2000-09-08', status: 'en_attente' });
    await insertMemberFixture(db, { licence: '00000004', seasonId: 2, firstName: 'Max', birthDate: '2000-09-09', status: 'valide' });

    expect(await names()).toEqual(['Léa 36', 'Tom 14', 'Zoé 26']);
  });

  // Le cas du 2026-09-08 : un jeune de la saison passée, pas encore réinscrit, n'a pas été
  // fêté. C'est la règle : la saison en cours, et elle seule.
  it("ne fête ni la saison passée ni un dossier annulé", async () => {
    await insertMemberFixture(db, { licence: '00000001', seasonId: 1, firstName: 'Thomas', birthDate: '2012-09-08', status: 'valide' });
    await insertMemberFixture(db, { licence: '00000002', seasonId: 2, firstName: 'Ana', birthDate: '1985-09-08', status: 'suspendu' });

    expect(await names()).toEqual([]);
  });
});
