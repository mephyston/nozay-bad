import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { asc } from 'drizzle-orm';
import { updateExpense } from './handler';
import { planifierPieces } from './pieces';
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

describe('planifierPieces', () => {
  it('retire ce qui n’est plus demandé, garde et replace le reste, ajoute le neuf', () => {
    const plan = planifierPieces([10, 11, 12], [{ id: 12 }, { dataUrl: PDF }, { id: 10 }]);
    expect(plan.retirees).toEqual([11]);
    expect(plan.gardees).toEqual([{ id: 12, position: 0 }, { id: 10, position: 2 }]);
    expect(plan.ajoutees).toEqual([{ dataUrl: PDF, mediaType: 'application/pdf', position: 1 }]);
  });

  it('refuse une liste vide, une pièce d’une autre note, un doublon', () => {
    expect(() => planifierPieces([10], [])).toThrow(/au moins un justificatif/);
    expect(() => planifierPieces([10], [{ id: 99 }])).toThrow(/inconnue/);
    expect(() => planifierPieces([10], [{ id: 10 }, { id: 10 }])).toThrow(/double/);
  });
});

describe('updateExpense — pièces jointes', () => {
  let db: any;
  let noteId: number;
  let pieces: number[];

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    const { categoryId } = await seedNoteDeFrais(db);
    const note = await db.insert(expensesTable).values({
      seasonId: 1, description: 'Déplacement', categoryId, amountCents: 1000, emitterName: 'M. Paul', status: 'pending', createdAt: new Date()
    }).returning().get();
    noteId = note.id;
    pieces = [];
    for (const [position, dataUrl] of [PHOTO, PDF].entries()) {
      const p = await db.insert(expenseAttachmentsTable).values({
        expenseId: noteId, position, mediaType: position ? 'application/pdf' : 'image/webp', dataUrl, createdAt: new Date()
      }).returning().get();
      pieces.push(p.id);
    }
  });

  const piecesEnBase = async () =>
    (await db.select().from(expenseAttachmentsTable).orderBy(asc(expenseAttachmentsTable.position)).all())
      .map((l: any) => ({ id: l.id, position: l.position, dataUrl: l.dataUrl }));

  it('enregistre la note et la nouvelle liste de pièces ensemble', async () => {
    const majee = await updateExpense(db, noteId, {
      description: 'Déplacement à Lyon',
      attachments: [{ id: pieces[1] }, { dataUrl: PHOTO }]
    });

    expect(majee.description).toBe('Déplacement à Lyon');
    const lignes = await piecesEnBase();
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toEqual({ id: pieces[1], position: 0, dataUrl: PDF });
    expect(lignes[1]).toMatchObject({ position: 1, dataUrl: PHOTO });
    expect(lignes[1].id).not.toBe(pieces[0]);
    // La copie de l'ancienne colonne suit la nouvelle première pièce, sans repartir vers l'écran.
    expect(majee).not.toHaveProperty('photoUrl');
    expect((await db.select().from(expensesTable).get()).photoUrl).toBe(PDF);
  });

  it('ne touche pas aux pièces quand la liste n’est pas envoyée', async () => {
    await updateExpense(db, noteId, { description: 'Autre motif' });
    expect((await piecesEnBase()).map((l: any) => l.id)).toEqual(pieces);
  });

  it('refuse une pièce d’une autre note sans rien écrire', async () => {
    await expect(updateExpense(db, noteId, { description: 'X', attachments: [{ id: 999 }] })).rejects.toThrow(/inconnue/);
    expect((await piecesEnBase()).map((l: any) => l.id)).toEqual(pieces);
  });
});
