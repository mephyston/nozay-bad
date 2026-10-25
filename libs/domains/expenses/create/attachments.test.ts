import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { createExpense } from './handler';
import { expenseAttachmentsTable, expensesTable } from '../shared/schema';
import { categoriesTable, seasonsTable } from '@nba/accounting/schema';

/** Une photo et un PDF minuscules, valides au sens du domaine. */
const PHOTO = 'data:image/webp;base64,UklGRg==';
const PDF = 'data:application/pdf;base64,JVBERi0xLjQ=';

/** La saison 25-26 ouverte et une catégorie : ce qu'une note exige pour exister. */
async function seedNoteDeFrais(db: any): Promise<{ categoryId: number }> {
  await db.insert(seasonsTable).values({
    id: 1, code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
  }).run();
  const cat = await db.insert(categoriesTable).values({
    adminLabel: 'Tournois', adherentLabel: 'Tournois', createdAt: new Date()
  }).returning().get();
  return { categoryId: cat.id };
}

describe('createExpense — pièces jointes', () => {
  let db: any;
  let categoryId: number;

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    ({ categoryId } = await seedNoteDeFrais(db));
  });

  const note = (extra: Record<string, unknown>) => ({
    seasonId: '25-26', description: 'Déplacement', category: categoryId, amount: 4500, emitterName: 'M. Paul', ...extra
  });

  it('écrit chaque pièce, dans l’ordre, avec son type', async () => {
    const creee = await createExpense(db, note({ attachments: [PHOTO, PDF] }));

    expect(creee.attachments.map((p) => p.mediaType)).toEqual(['image/webp', 'application/pdf']);
    const lignes = await db.select().from(expenseAttachmentsTable).all();
    expect(lignes.map((l: any) => [l.expenseId, l.position, l.dataUrl])).toEqual([
      [creee.id, 0, PHOTO],
      [creee.id, 1, PDF]
    ]);
    // L'ancienne colonne garde une copie de la première pièce (retour arrière), sans la
    // renvoyer à l'écran.
    expect(creee.photoUrl).toBeNull();
    const enBase = await db.select().from(expensesTable).all();
    expect(enBase[0].photoUrl).toBe(PHOTO);
  });

  it('rattache les pièces à leur note quand d’autres notes existent déjà', async () => {
    const premiere = await createExpense(db, note({ attachments: [PHOTO] }));
    const seconde = await createExpense(db, note({ attachments: [PDF, PHOTO, PDF] }));

    expect(premiere.attachments).toHaveLength(1);
    expect(seconde.attachments).toHaveLength(3);
    const deLaSeconde = (await db.select().from(expenseAttachmentsTable).all()).filter((l: any) => l.expenseId === seconde.id);
    expect(deLaSeconde).toHaveLength(3);
    const notes = await db.select().from(expensesTable).all();
    expect(notes.map((n: any) => n.photoUrl)).toEqual([PHOTO, PDF]);
  });

  it('accepte encore l’ancien justificatif unique', async () => {
    const creee = await createExpense(db, note({ photoUrl: PDF }));
    expect(creee.attachments.map((p) => p.mediaType)).toEqual(['application/pdf']);
  });

  it('refuse une pièce qui n’est ni une photo ni un PDF, sans rien écrire', async () => {
    await expect(createExpense(db, note({ attachments: [PHOTO, 'data:text/html;base64,PGI+'] })))
      .rejects.toThrow(/ni une photo ni un PDF/);
    expect(await db.select().from(expenseAttachmentsTable).all()).toHaveLength(0);
  });

  it('refuse une sixième pièce', async () => {
    await expect(createExpense(db, note({ attachments: Array(6).fill(PHOTO) }))).rejects.toThrow(/5 pièces/);
  });
});
