import { describe, it, expect } from 'vitest';
import { app } from './index';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { insertMemberFixtures } from '@nba/members/test-fixtures';
import { TEST_ADMIN_EMAIL, seedTestAdmin } from './authz/test-identity';

const ADMIN = { 'x-api-key': 'secret123', 'x-caller': 'admin', 'x-user-email': TEST_ADMIN_EMAIL };

describe('GET /dashboard/overview — pyramide des âges', () => {
  it('range les adhésions de la saison par catégorie fédérale, F et H séparés', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);
    const season = await db
      .insert(seasonsTable)
      .values({ code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: true, createdAt: new Date() })
      .returning()
      .get();
    const base = { seasonId: season.id, status: 'valide', type: 'Loisirs', paid: true, amountRemainingCents: 0, importedAt: new Date() } as const;
    await insertMemberFixtures(db, [
      { ...base, licence: '00000001', lastName: 'A', firstName: 'a', gender: 'F', birthDate: '2019-05-01' }, // minibad
      { ...base, licence: '00000002', lastName: 'B', firstName: 'b', gender: 'M', birthDate: '2016-05-01' }, // poussin
      { ...base, licence: '00000003', lastName: 'C', firstName: 'c', gender: 'M', birthDate: '2017-05-01' }, // poussin
      { ...base, licence: '00000004', lastName: 'D', firstName: 'd', gender: 'F', birthDate: '1982-05-01' }, // V2
      { ...base, licence: '00000005', lastName: 'E', firstName: 'e', gender: 'M', birthDate: '2000-05-01', status: 'en_attente' } // senior, tous statuts comptent
    ]);

    const res = await app.request('http://localhost/dashboard/overview', { headers: ADMIN }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as any;
    const byCode = Object.fromEntries(data.members.ageCategories.map((r: any) => [r.code, r]));
    expect(byCode.U9).toMatchObject({ f: 1, m: 0, total: 1, youth: true, birthYears: '2018 et après' });
    expect(byCode.U11).toMatchObject({ f: 0, m: 2, total: 2, birthYears: '2016 – 2017' });
    expect(byCode.S).toMatchObject({ f: 0, m: 1, total: 1 });
    expect(byCode.V2).toMatchObject({ f: 1, m: 0, total: 1, youth: false });
    expect(byCode.V8.total).toBe(0);
    expect(data.members.ageCategories.reduce((n: number, r: any) => n + r.total, 0)).toBe(data.members.currentTotal);
  });

  it('ventile renouvelés, nouveaux et non renouvelés par groupe, par personne', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);
    const [prev, cur] = await db
      .insert(seasonsTable)
      .values([
        { code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: false, createdAt: new Date() },
        { code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: true, createdAt: new Date() }
      ])
      .returning()
      .all();
    const base = { status: 'valide', paid: true, amountRemainingCents: 0, importedAt: new Date(), gender: 'M', birthDate: '1990-01-01' } as const;
    await insertMemberFixtures(db, [
      // n-1 : deux poussins, un loisir.
      { ...base, seasonId: prev.id, licence: '00000001', lastName: 'A', firstName: 'a', type: 'Poussins' },
      { ...base, seasonId: prev.id, licence: '00000002', lastName: 'B', firstName: 'b', type: 'Poussins' },
      { ...base, seasonId: prev.id, licence: '00000003', lastName: 'C', firstName: 'c', type: 'Loisirs' },
      // n : A monte en Loisirs (renouvelé, pas perdu), B est perdu, C reste, D arrive.
      { ...base, seasonId: cur.id, licence: '00000001', lastName: 'A', firstName: 'a', type: 'Loisirs' },
      { ...base, seasonId: cur.id, licence: '00000003', lastName: 'C', firstName: 'c', type: 'Loisirs' },
      { ...base, seasonId: cur.id, licence: '00000004', lastName: 'D', firstName: 'd', type: 'Poussins' }
    ]);

    const res = await app.request('http://localhost/dashboard/overview?seasonId=26-27', { headers: ADMIN }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    const { data } = (await res.json()) as any;
    expect(data.members.renewalByGroup).toEqual([
      { group: 'Loisirs', total: 2, renewed: 2, newcomers: 0 },
      { group: 'Poussins', total: 1, renewed: 0, newcomers: 1 }
    ]);
    expect(data.members.lapsedByGroup).toEqual([
      { group: 'Poussins', previousTotal: 2, lapsed: 1 },
      { group: 'Loisirs', previousTotal: 1, lapsed: 0 }
    ]);
    expect(data.members).toMatchObject({ renewed: 2, newcomers: 1, lapsed: 1 });
  });
});
