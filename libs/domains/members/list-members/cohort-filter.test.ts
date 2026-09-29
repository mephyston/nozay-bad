import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { personsTable, membershipsTable } from '../shared/schema';
import { listMembers } from './handler';

/**
 * La cohorte de la liste doit ouvrir exactement ce que la carte « Renouvellement » a compté.
 * Testé sur la base réelle : c'est le `EXISTS` corrélé par personne qui est en jeu.
 */
describe('filtre de cohorte de la liste des adhérents', () => {
  let db: any;

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values([
      { id: 1, code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: false, closedAt: null, createdAt: new Date() },
      { id: 2, code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: true, closedAt: null, createdAt: new Date() }
    ]);
    const now = new Date();
    const person = (id: number, nom: string) => ({ id, licence: `0716235${id}`, lastName: nom, firstName: 'X', gender: 'M' as const, birthDate: '1990-01-01', createdAt: now, updatedAt: now });
    await db.insert(personsTable).values([person(1, 'ABADIE'), person(2, 'NOUVEAU'), person(3, 'PARTI')]);
    const adhesion = (personId: number, seasonId: number) => ({ personId, seasonId, status: 'valide', type: 'Loisir', importedAt: now });
    await db.insert(membershipsTable).values([adhesion(1, 1), adhesion(3, 1), adhesion(1, 2), adhesion(2, 2)]);
  });

  const noms = async (cohort: any, season = '26-27') =>
    (await listMembers(db, { season, cohort }, { page: 1, limit: 50 })).data.map((m: any) => m.lastName);

  it("« renouvelés » : présents en n-1 et cette saison — Abadie, pas le nouveau", async () => {
    expect(await noms('renewed')).toEqual(['ABADIE']);
  });

  it("« nouveaux » : cette saison sans adhésion en n-1", async () => {
    expect(await noms('new')).toEqual(['NOUVEAU']);
  });

  it("« non renouvelés » : adhérents de n-1 sans adhésion cette saison — Abadie a repris, il n'y est pas", async () => {
    expect(await noms('lapsed')).toEqual(['PARTI']);
  });

  it("sans saison précédente, tout le monde est nouveau et personne n'est parti", async () => {
    expect(await noms('new', '25-26')).toEqual(['ABADIE', 'PARTI']);
    expect(await noms('renewed', '25-26')).toEqual([]);
    expect(await noms('lapsed', '25-26')).toEqual([]);
  });

  it('sans cohorte, la liste de la saison est inchangée', async () => {
    expect(await noms(undefined)).toEqual(['ABADIE', 'NOUVEAU']);
  });
});

/**
 * Un dossier suspendu n'est pas une adhésion, ni pour le tableau de bord ni pour la liste
 * qu'il ouvre : les deux doivent annoncer les mêmes personnes.
 */
describe('dossiers suspendus dans la liste des adhérents', () => {
  let db: any;

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values([
      { id: 1, code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: false, closedAt: null, createdAt: new Date() },
      { id: 2, code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: true, closedAt: null, createdAt: new Date() }
    ]);
    const now = new Date();
    const person = (id: number, nom: string) => ({ id, licence: `0716235${id}`, lastName: nom, firstName: 'X', gender: 'M' as const, birthDate: '1990-01-01', createdAt: now, updatedAt: now });
    await db.insert(personsTable).values([person(1, 'ABADIE'), person(2, 'ANNULE'), person(3, 'REVENU'), person(4, 'SUSPENDU')]);
    const adhesion = (personId: number, seasonId: number, status = 'valide') => ({ personId, seasonId, status, type: 'Loisir', importedAt: now });
    await db.insert(membershipsTable).values([
      adhesion(1, 1), adhesion(1, 2),
      // Nouvelle personne, dossier annulé cette saison.
      adhesion(2, 2, 'suspendu'),
      // Suspendue en n-1, revenue cette saison : c'est une arrivée, pas un renouvellement.
      adhesion(3, 1, 'suspendu'), adhesion(3, 2, 'en_attente'),
      // Adhérente en n-1, suspendue cette saison : elle n'a pas renouvelé.
      adhesion(4, 1), adhesion(4, 2, 'suspendu')
    ]);
  });

  const noms = async (filters: any) =>
    (await listMembers(db, { season: '26-27', ...filters }, { page: 1, limit: 50 })).data.map((m: any) => m.lastName);

  it('« hors suspendus » retient tous les autres statuts', async () => {
    expect(await noms({ status: 'inscrits' })).toEqual(['ABADIE', 'REVENU']);
  });

  it('sans filtre de statut, les suspendus restent listés', async () => {
    expect(await noms({})).toEqual(['ABADIE', 'ANNULE', 'REVENU', 'SUSPENDU']);
  });

  it('les cohortes ignorent les suspendus des deux saisons', async () => {
    expect(await noms({ cohort: 'renewed' })).toEqual(['ABADIE']);
    expect(await noms({ cohort: 'new' })).toEqual(['REVENU']);
    expect(await noms({ cohort: 'lapsed' })).toEqual(['SUSPENDU']);
  });
});
