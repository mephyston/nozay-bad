import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  indivRequestsTable,
  indivSessionsTable,
  type IndivRequestRow,
  type IndivSessionRow
} from '../../shared/indiv-schema';

export class RequestIndivRepository {
  async findSession(db: DbOrTx, id: number): Promise<IndivSessionRow | undefined> {
    return db.select().from(indivSessionsTable).where(eq(indivSessionsTable.id, id)).get();
  }

  /**
   * Upsert sur l'index unique `(session_id, member_id)` plutôt qu'un « lire puis
   * décider » : un double-clic suffirait sinon à créer deux lignes. `selected_slot` est
   * absent du `set` — c'est la décision de l'entraîneur, la candidature ne la porte pas.
   */
  async upsert(db: DbOrTx, values: typeof indivRequestsTable.$inferInsert): Promise<void> {
    await db
      .insert(indivRequestsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [indivRequestsTable.sessionId, indivRequestsTable.memberId],
        set: {
          licence: values.licence,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          memberGroup: values.memberGroup,
          preferredSlot: values.preferredSlot,
          note: values.note,
          updatedAt: values.updatedAt
        }
      });
  }

  async find(db: DbOrTx, sessionId: number, memberId: number): Promise<IndivRequestRow | undefined> {
    return db
      .select()
      .from(indivRequestsTable)
      .where(and(eq(indivRequestsTable.sessionId, sessionId), eq(indivRequestsTable.memberId, memberId)))
      .get();
  }
}
