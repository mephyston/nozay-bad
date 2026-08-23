import { describe, it, expect, beforeEach } from 'vitest';
import { seasonsTable } from '@nba/accounting/schema';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { insertMemberFixtures } from '../shared/test-fixtures';
import { listMembers } from './handler';

/**
 * Recherche d'un adhérent dans la liste.
 *
 * Le cas qui l'a révélée : « GAUTIER DE LAHAUT Chloé », importée de Poona sous cette
 * orthographe. Qui tape « Gautier de la haut » ne trouvait rien et concluait que
 * l'import l'avait oubliée — alors qu'elle était bien en base.
 */
describe('recherche dans la liste des adhérents', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    const season = await db
      .insert(seasonsTable)
      .values({
        code: '26-27', name: 'Saison 26-27', startDate: '2026-09-01', endDate: '2027-08-31',
        active: true, closedAt: null, createdAt: new Date()
      })
      .returning()
      .get();
    seasonId = season.id;

    await insertMemberFixtures(db, [
      { licence: '07739419', seasonId, lastName: 'GAUTIER DE LAHAUT', firstName: 'Chloé', gender: 'F' },
      { licence: '00112233', seasonId, lastName: 'DUPONT', firstName: 'Marc', gender: 'M' }
    ]);
  });

  async function search(term: string) {
    const { data } = await listMembers(db, { search: term, season: '26-27' } as any, { page: 1, limit: 50 });
    return data.map((m: any) => m.lastName);
  }

  it("retrouve un nom à particule écrit avec les espaces qu'on lui donne d'habitude", async () => {
    expect(await search('Gautier de la haut')).toEqual(['GAUTIER DE LAHAUT']);
  });

  it('retrouve un adhérent par prénom et nom, dans les deux ordres', async () => {
    expect(await search('Chloé Gautier')).toEqual(['GAUTIER DE LAHAUT']);
    expect(await search('Gautier Chloé')).toEqual(['GAUTIER DE LAHAUT']);
  });

  it('mêle le nom et la licence', async () => {
    expect(await search('Gautier 0773')).toEqual(['GAUTIER DE LAHAUT']);
  });

  it('reste sélectif : chaque terme doit se retrouver', async () => {
    expect(await search('Gautier Marc')).toEqual([]);
  });

  it('trouve toujours par un seul terme', async () => {
    expect(await search('dupont')).toEqual(['DUPONT']);
  });
});
