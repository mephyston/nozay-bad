import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { personsTable, membershipsTable } from './schema';
import { buildMembersDashboardStatsStmt } from './dashboard';

/**
 * Le renouvellement se mesure par personne, sur la base réelle : c'est le `EXISTS` corrélé
 * qui est en jeu, un double ne prouverait rien.
 */
describe('buildMembersDashboardStatsStmt', () => {
  let db: any;
  let d1: D1Database;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db; d1 = mock.mockD1;
    const now = new Date();
    const person = (id: number, nom: string) => ({ id, licence: `0770000${id}`, lastName: nom, firstName: 'A', gender: 'M' as const, birthDate: '1990-01-01', createdAt: now, updatedAt: now });
    await db.insert(personsTable).values([person(1, 'FIDELE'), person(2, 'FIDELE2'), person(3, 'NOUVEAU'), person(4, 'PARTI'), person(5, 'PARTI2'), person(6, 'PARTI3')]);
    const adhesion = (personId: number, seasonId: number, status = 'valide') => ({ personId, seasonId, status, type: 'Loisirs', importedAt: now });
    await db.insert(membershipsTable).values([
      // n-1 : 5 adhésions, dont 2 qui reviennent.
      adhesion(1, 1), adhesion(2, 1), adhesion(4, 1), adhesion(5, 1), adhesion(6, 1),
      // n : 3 adhésions — 2 renouvellements, 1 arrivée ; statuts pour les relances.
      adhesion(1, 2, 'valide'), adhesion(2, 2, 'en_attente'), adhesion(3, 2, 'incomplet')
    ]);
  });

  it('compte les renouvellements par personne, et les relances par statut', async () => {
    const row = await buildMembersDashboardStatsStmt(d1, 2, 1).first<any>();
    expect(row).toMatchObject({ currentTotal: 3, previousTotal: 5, renewed: 2, partiallyPaid: 1, unpaidCount: 1 });
  });

  it('sans saison précédente, rien n’est renouvelé et l’effectif n-1 est nul', async () => {
    const row = await buildMembersDashboardStatsStmt(d1, 2, null).first<any>();
    expect(row).toMatchObject({ currentTotal: 3, previousTotal: 0, renewed: 0 });
  });
});
