import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { listExpenses, listAttachmentContents } from './handler';
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

describe('listExpenses — pièces jointes', () => {
  let db: any;
  let categoryId: number;

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    ({ categoryId } = await seedNoteDeFrais(db));
  });

  async function noteAvec(pieces: string[]) {
    const note = await db.insert(expensesTable).values({
      seasonId: 1, description: 'Déplacement', categoryId, amountCents: 1000, emitterName: 'M. Paul',
      status: 'pending', photoUrl: 'data:image/jpeg;base64,ANCIEN', createdAt: new Date()
    }).returning().get();
    for (const [position, dataUrl] of pieces.entries()) {
      await db.insert(expenseAttachmentsTable).values({
        expenseId: note.id, position, mediaType: dataUrl.slice(5, dataUrl.indexOf(';')), dataUrl, createdAt: new Date()
      }).run();
    }
    return note.id as number;
  }

  it('résume les pièces de chaque note, sans leur contenu ni l’ancienne colonne', async () => {
    const deux = await noteAvec([PDF, PHOTO]);
    const aucune = await noteAvec([]);

    const notes = await listExpenses(db, { season: '25-26' });
    const parId = Object.fromEntries(notes.map((n) => [n.id, n]));

    expect(parId[deux].attachments.map((p) => p.mediaType)).toEqual(['application/pdf', 'image/webp']);
    expect(parId[deux].attachments[0]).not.toHaveProperty('dataUrl');
    expect(parId[deux]).not.toHaveProperty('photoUrl');
    expect(parId[aucune].attachments).toEqual([]);
  });

  it('ne mêle pas les pièces d’une note filtrée', async () => {
    await noteAvec([PHOTO]);
    expect(await listExpenses(db, { season: '25-26', status: 'approved' })).toEqual([]);
  });

  it('rend le contenu des pièces dans l’ordre, pour l’export', async () => {
    const id = await noteAvec([PDF, PHOTO]);
    expect(await listAttachmentContents(db, id)).toEqual([
      { mediaType: 'application/pdf', dataUrl: PDF },
      { mediaType: 'image/webp', dataUrl: PHOTO }
    ]);
  });
});
