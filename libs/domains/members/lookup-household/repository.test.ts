import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { membersTable } from '@nba/members/schema';
import { LookupHouseholdRepository } from './repository';

describe('LookupHouseholdRepository', () => {
  let db: any;
  let seasonId = 1;
  const repo = new LookupHouseholdRepository();

  const baseMember = {
    seasonId: 1,
    gender: 'M' as const,
    birthDate: '2010-01-01',
    type: 'jeune',
    importedAt: new Date()
  };

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    const season = await db
      .insert(seasonsTable)
      .values({ code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() })
      .returning()
      .get();
    seasonId = season.id;

    // Foyer : deux enfants (email du parent en contact) + le parent (email direct).
    await db.insert(membersTable).values([
      { ...baseMember, seasonId, licence: '1000001', lastName: 'Martin', firstName: 'Léa', gender: 'F', email: null, parent1Email: 'parent@ex.fr' },
      { ...baseMember, seasonId, licence: '1000002', lastName: 'Martin', firstName: 'Tom', email: null, parent1Email: 'parent@ex.fr' },
      { ...baseMember, seasonId, licence: '1000003', lastName: 'Martin', firstName: 'Papa', email: 'Parent@Ex.fr', type: 'adulte', birthDate: '1980-01-01', paid: true },
      // Adhérent sans lien
      { ...baseMember, seasonId, licence: '2000001', lastName: 'Durand', firstName: 'Zoé', gender: 'F', email: 'autre@ex.fr' }
    ]).run();
  });

  it('retourne tout le foyer à partir de l’email (adhérent + contacts parent), insensible à la casse', async () => {
    const res = await repo.lookup(db, 'parent@ex.fr');
    expect(res.accountEmail).toBe('parent@ex.fr');
    const licences = res.members.map((m) => m.licence).sort();
    expect(licences).toEqual(['1000001', '1000002', '1000003']);
  });

  it('accepte l’email en casse différente', async () => {
    const res = await repo.lookup(db, 'PARENT@EX.FR');
    expect(res.members).toHaveLength(3);
  });

  it('remonte le statut de paiement (paid) de chaque membre', async () => {
    const res = await repo.lookup(db, 'parent@ex.fr');
    const papa = res.members.find((m) => m.firstName === 'Papa');
    const lea = res.members.find((m) => m.firstName === 'Léa');
    expect(papa?.paid).toBe(true);
    expect(lea?.paid).toBe(false);
  });

  it('résout la licence d’un enfant vers l’email du foyer et débloque tout le foyer', async () => {
    const res = await repo.lookup(db, '1000001');
    expect(res.accountEmail).toBe('parent@ex.fr');
    expect(res.members).toHaveLength(3);
  });

  it('isole un adhérent non rattaché', async () => {
    const res = await repo.lookup(db, 'autre@ex.fr');
    expect(res.members.map((m) => m.licence)).toEqual(['2000001']);
  });

  it('renvoie un foyer vide pour un email inconnu', async () => {
    const res = await repo.lookup(db, 'inconnu@ex.fr');
    expect(res.members).toHaveLength(0);
  });

  it('renvoie un foyer vide pour une licence inconnue', async () => {
    const res = await repo.lookup(db, '9999999');
    expect(res.accountEmail).toBeNull();
    expect(res.members).toHaveLength(0);
  });
});
