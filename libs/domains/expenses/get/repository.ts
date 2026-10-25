import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expenseAttachmentsTable } from '../shared/schema';
import type { GetAttachmentInput, GetAttachmentOutput } from './dto';

export class GetAttachmentRepository {
  /** La pièce **de cette note** : un identifiant de pièce seul ouvrirait celle d'une autre. */
  async get(db: DbOrTx, input: GetAttachmentInput): Promise<GetAttachmentOutput | undefined> {
    return db
      .select({
        id: expenseAttachmentsTable.id,
        mediaType: expenseAttachmentsTable.mediaType,
        dataUrl: expenseAttachmentsTable.dataUrl
      })
      .from(expenseAttachmentsTable)
      .where(and(
        eq(expenseAttachmentsTable.id, input.attachmentId),
        eq(expenseAttachmentsTable.expenseId, input.expenseId)
      ))
      .get();
  }
}
