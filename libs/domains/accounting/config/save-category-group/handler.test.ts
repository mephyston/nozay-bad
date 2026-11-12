import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { sql } from 'drizzle-orm';
import { createCategoryGroup, updateCategoryGroup } from './handler';
import { deleteCategoryGroup } from '../delete-category-group/handler';
import { listCategoryGroups } from '../list-category-groups/handler';
import { updateCategory } from '../update-category/handler';

describe('pôles et rubriques', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('reprend les quatre pôles et les rubriques, avec une seule rubrique des cotisations', async () => {
    const groups = await listCategoryGroups(db);
    expect(groups.filter((g) => g.kind === 'pole').map((g) => g.label)).toEqual([
      'Pôle Compétition', 'Pôle Jeunes', 'Pôle Matériel', 'Pôle Fonctionnement'
    ]);
    expect(groups.filter((g) => g.membershipFees).map((g) => g.label)).toEqual(['Cotisations']);
  });

  it('range les catégories de la reprise par les mots de l’ancien classement', async () => {
    const row = await db.get<{ pole: string; rub: string }>(sql`
      SELECT p.label AS pole, r.label AS rub FROM categories c
      JOIN category_groups p ON p.id = c.pole_id JOIN category_groups r ON r.id = c.rubrique_id
      WHERE c.admin_label = 'Volants'`);
    expect(row).toEqual({ pole: 'Pôle Matériel', rub: 'Volants et matériel' });
  });

  it('crée à la suite, refuse un doublon, et ne garde qu’une rubrique des cotisations', async () => {
    const created = await createCategoryGroup(db, { kind: 'rubrique', label: ' Adhésions jeunes ', membershipFees: true });
    expect(created).toMatchObject({ label: 'Adhésions jeunes', position: 10, membershipFees: true });
    let flagged = (await listCategoryGroups(db)).filter((g) => g.membershipFees);
    expect(flagged.map((g) => g.label)).toEqual(['Adhésions jeunes']);

    const cotisations = (await listCategoryGroups(db)).find((g) => g.label === 'Cotisations')!;
    await updateCategoryGroup(db, cotisations.id, { membershipFees: true });
    flagged = (await listCategoryGroups(db)).filter((g) => g.membershipFees);
    expect(flagged.map((g) => g.label)).toEqual(['Cotisations']);

    await expect(createCategoryGroup(db, { kind: 'rubrique', label: 'Cotisations' })).rejects.toMatchObject({ status: 409 });
    // Le même libellé reste libre dans l'autre famille.
    await expect(createCategoryGroup(db, { kind: 'pole', label: 'Cotisations' })).resolves.toBeTruthy();
  });

  it('refuse le drapeau des cotisations sur un pôle', async () => {
    const pole = (await listCategoryGroups(db)).find((g) => g.kind === 'pole')!;
    await expect(updateCategoryGroup(db, pole.id, { membershipFees: true })).rejects.toMatchObject({ status: 400 });
    const created = await createCategoryGroup(db, { kind: 'pole', label: 'Pôle Loisir', membershipFees: true });
    expect(created.membershipFees).toBe(false);
  });

  it('range une catégorie, refuse une rubrique à la place d’un pôle, et libère à la suppression', async () => {
    const groups = await listCategoryGroups(db);
    const pole = groups.find((g) => g.label === 'Pôle Jeunes')!;
    const rubrique = groups.find((g) => g.label === 'Fonctionnement')!;
    const volants = await db.get<{ id: number }>(sql`SELECT id FROM categories WHERE admin_label = 'Volants'`);

    await expect(updateCategory(db, volants!.id, { poleId: rubrique.id })).rejects.toThrow(/Pôle inconnu/);
    await updateCategory(db, volants!.id, { poleId: pole.id, rubriqueId: rubrique.id });

    await deleteCategoryGroup(db, pole.id);
    const after = await db.get<{ pole_id: number | null; rubrique_id: number | null }>(sql`SELECT pole_id, rubrique_id FROM categories WHERE id = ${volants!.id}`);
    expect(after).toEqual({ pole_id: null, rubrique_id: rubrique.id });
    await expect(deleteCategoryGroup(db, pole.id)).rejects.toMatchObject({ status: 404 });
  });
});
