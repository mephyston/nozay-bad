import { getSeasonId } from '@nba/accounting-api';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expenseAttachmentsTable, expensesTable } from '../shared/schema';
import type { ListExpensesOutput } from './dto';

/*
  Tout sauf `photo_url` : la liste rendait le contenu de chaque justificatif, quelques
  centaines de Ko par note, pour un écran qui n'en affiche aucun avant qu'on clique. Les
  pièces se lisent désormais une à une (`GET /expenses/:id/attachments/:pieceId`).
*/
const { photoUrl: _contenu, ...COLONNES } = getTableColumns(expensesTable);

export class ListExpensesRepository {
  async list(db: DbOrTx, filters: { season?: string; status?: string; memberId?: number }): Promise<ListExpensesOutput> {
    const conditions = [];
    if (filters.memberId) conditions.push(eq(expensesTable.memberId, filters.memberId));
    if (filters.season) {
      const sId = await getSeasonId(db, filters.season);
      if (sId !== undefined) {
        conditions.push(eq(expensesTable.seasonId, sId));
      } else {
        return [];
      }
    }
    if (filters.status) conditions.push(eq(expensesTable.status, filters.status as 'pending' | 'approved' | 'rejected'));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const notes = await db.select(COLONNES).from(expensesTable).where(whereClause).all();

    // Les pièces des mêmes notes, par sous-requête : une liste d'identifiants liés
    // dépasserait les 100 variables de D1 sur une saison chargée.
    const pieces = await db
      .select({
        id: expenseAttachmentsTable.id,
        expenseId: expenseAttachmentsTable.expenseId,
        mediaType: expenseAttachmentsTable.mediaType
      })
      .from(expenseAttachmentsTable)
      .where(inArray(expenseAttachmentsTable.expenseId, db.select({ id: expensesTable.id }).from(expensesTable).where(whereClause)))
      .orderBy(asc(expenseAttachmentsTable.expenseId), asc(expenseAttachmentsTable.position))
      .all();

    const parNote = new Map<number, { id: number; mediaType: string }[]>();
    for (const { expenseId, ...piece } of pieces) {
      parNote.set(expenseId, [...(parNote.get(expenseId) ?? []), piece]);
    }
    return notes.map((note) => ({ ...note, attachments: parNote.get(note.id) ?? [] }));
  }

  /** Les pièces d'une note, contenu compris, dans l'ordre où elles ont été jointes. */
  async contents(db: DbOrTx, expenseId: number): Promise<{ mediaType: string; dataUrl: string }[]> {
    return db
      .select({ mediaType: expenseAttachmentsTable.mediaType, dataUrl: expenseAttachmentsTable.dataUrl })
      .from(expenseAttachmentsTable)
      .where(eq(expenseAttachmentsTable.expenseId, expenseId))
      .orderBy(asc(expenseAttachmentsTable.position))
      .all();
  }
}
