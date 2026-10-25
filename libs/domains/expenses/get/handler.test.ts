import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { getAttachment } from './handler';
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

describe('getAttachment', () => {
  let db: any;
  let notes: number[];
  let pieces: number[];

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    const { categoryId } = await seedNoteDeFrais(db);
    notes = [];
    pieces = [];
    for (const dataUrl of [PHOTO, PDF]) {
      const note = await db.insert(expensesTable).values({
        seasonId: 1, description: 'Achat', categoryId, amountCents: 1000, emitterName: 'M. Paul', status: 'pending', createdAt: new Date()
      }).returning().get();
      const piece = await db.insert(expenseAttachmentsTable).values({
        expenseId: note.id, position: 0, mediaType: 'x', dataUrl, createdAt: new Date()
      }).returning().get();
      notes.push(note.id);
      pieces.push(piece.id);
    }
  });

  it('rend le contenu de la pièce demandée', async () => {
    const piece = await getAttachment(db, { expenseId: notes[1], attachmentId: pieces[1] });
    expect(piece).toEqual({ id: pieces[1], mediaType: 'x', dataUrl: PDF });
  });

  it('refuse la pièce d’une autre note', async () => {
    await expect(getAttachment(db, { expenseId: notes[0], attachmentId: pieces[1] })).rejects.toThrow(/introuvable/);
  });
});
