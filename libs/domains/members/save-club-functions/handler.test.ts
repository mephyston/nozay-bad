import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { memberClubFunctionsTable, membersTable } from '@nba/members/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { saveClubFunctions } from './handler';
import { getClubFunctionsStatus, listClubFunctions } from '../list-club-functions/handler';
import { getContactEmailsForClubFunctions } from '../shared/queries';

function member(id: number, licence: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    licence,
    seasonId: 1,
    lastName: `Nom${id}`,
    firstName: `Prenom${id}`,
    gender: 'M' as const,
    birthDate: '1980-01-01',
    email: `contact${id}@example.org`,
    type: 'adulte',
    importedAt: new Date(),
    ...extra
  };
}

describe('saveClubFunctions', () => {
  let db: any;

  beforeEach(async () => {
    const m = await setupMockDb();
    db = m.db;
    await db
      .insert(seasonsTable)
      .values({ id: 1, code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() })
      .run();
    await db
      .insert(membersTable)
      .values([member(1, '07000001'), member(2, '07000002'), member(3, '07000003')])
      .run();
  });

  it('attribue une fonction, la remplace, puis la retire', async () => {
    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['president'] });
    let rows = await listClubFunctions(db, '25-26');
    expect(rows.map((r) => r.function)).toEqual(['president']);
    expect(rows[0].firstName).toBe('Prenom1');

    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['coach'] });
    rows = await listClubFunctions(db, '25-26');
    expect(rows.map((r) => r.function)).toEqual(['coach']);

    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: [] });
    expect(await listClubFunctions(db, '25-26')).toEqual([]);
  });

  it('refuse le cumul : une seule fonction par adhérent et par saison', async () => {
    await expect(
      saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['president', 'treasurer'] })
    ).rejects.toThrow(/une seule fonction/);
  });

  it('refuse un second président sur la saison, en nommant le titulaire', async () => {
    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['president'] });
    await expect(
      saveClubFunctions(db, { licence: '07000002', season: '25-26', functions: ['president'] })
    ).rejects.toThrow(/Président.*Prenom1 Nom1/);
  });

  it('re-enregistrer le même titulaire unique ne conflicte pas avec lui-même', async () => {
    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['treasurer'] });
    await expect(
      saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['treasurer'] })
    ).resolves.toBeTruthy();
  });

  it('accepte plusieurs entraîneurs, un par adhérent', async () => {
    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['coach'] });
    await saveClubFunctions(db, { licence: '07000002', season: '25-26', functions: ['coach'] });
    await saveClubFunctions(db, { licence: '07000003', season: '25-26', functions: ['vice_president'] });
    const rows = await listClubFunctions(db, '25-26');
    expect(rows).toHaveLength(3);
  });

  it('refuse une licence hors référentiel de la saison', async () => {
    await expect(
      saveClubFunctions(db, { licence: '09999999', season: '25-26', functions: ['coach'] })
    ).rejects.toThrow(/référentiel/);
  });

  it('les index bloquent doublon de titulaire unique et cumul, même hors application', async () => {
    const now = new Date();
    await db.insert(memberClubFunctionsTable).values({ seasonId: 1, licence: '07000001', function: 'president', createdAt: now }).run();
    // Deux présidents : refusé par l'index partiel.
    await expect(
      db.insert(memberClubFunctionsTable).values({ seasonId: 1, licence: '07000002', function: 'president', createdAt: now }).run()
    ).rejects.toThrow();
    // Cumul président + entraîneur pour la même licence : refusé par (season, licence).
    await expect(
      db.insert(memberClubFunctionsTable).values({ seasonId: 1, licence: '07000001', function: 'coach', createdAt: now }).run()
    ).rejects.toThrow();
    // Deux entraîneurs distincts : accepté.
    await db.insert(memberClubFunctionsTable).values({ seasonId: 1, licence: '07000002', function: 'coach', createdAt: now }).run();
    await db.insert(memberClubFunctionsTable).values({ seasonId: 1, licence: '07000003', function: 'coach', createdAt: now }).run();
  });

  it('le statut réclame président et trésorier tant qu’ils ne sont pas désignés', async () => {
    // Un entraîneur saisi ne suffit pas : le bureau n'est pas en place.
    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['coach'] });
    let status = await getClubFunctionsStatus(db, '2025-10-01');
    expect(status.seasonCode).toBe('25-26');
    expect(status.missing.sort()).toEqual(['president', 'treasurer']);

    await saveClubFunctions(db, { licence: '07000002', season: '25-26', functions: ['president'] });
    status = await getClubFunctionsStatus(db, '2025-10-01');
    expect(status.missing).toEqual(['treasurer']);

    await saveClubFunctions(db, { licence: '07000003', season: '25-26', functions: ['treasurer'] });
    status = await getClubFunctionsStatus(db, '2025-10-01');
    expect(status.missing).toEqual([]);

    // Hors de toute saison connue : rien à signaler.
    expect((await getClubFunctionsStatus(db, '2030-01-01')).seasonCode).toBeNull();
  });

  it('le secrétaire est unique par saison', async () => {
    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['secretary'] });
    await expect(
      saveClubFunctions(db, { licence: '07000002', season: '25-26', functions: ['secretary'] })
    ).rejects.toThrow(/Secrétaire.*Prenom1 Nom1/);
  });

  it('cible les emails de contact des titulaires, parents inclus, sans doublon', async () => {
    await db
      .insert(membersTable)
      .values(member(4, '07000004', { email: null, parent1Email: 'Parent@Example.org' }))
      .run();
    await saveClubFunctions(db, { licence: '07000001', season: '25-26', functions: ['coach'] });
    await saveClubFunctions(db, { licence: '07000004', season: '25-26', functions: ['committee_member'] });

    const all = await getContactEmailsForClubFunctions(db, '25-26');
    expect(all.sort()).toEqual(['contact1@example.org', 'parent@example.org']);

    const onlyCoach = await getContactEmailsForClubFunctions(db, '25-26', ['coach']);
    expect(onlyCoach).toEqual(['contact1@example.org']);

    // Liste vide = personne, jamais « tout le club ».
    expect(await getContactEmailsForClubFunctions(db, '25-26', [])).toEqual([]);
  });
});
