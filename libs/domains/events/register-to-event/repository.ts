import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubEventsTable,
  clubEventRegistrationsTable,
  type ClubEventRow,
  type ClubEventRegistrationRow
} from '../shared/schema';

export class RegisterToEventRepository {
  async findEvent(db: DbOrTx, id: number): Promise<ClubEventRow | undefined> {
    return db.select().from(clubEventsTable).where(eq(clubEventsTable.id, id)).get();
  }

  /**
   * Inscrit, ou met à jour l'inscription existante.
   *
   * L'écriture s'appuie sur l'index unique `(event_id, member_id)` plutôt que sur un
   * « lire puis décider » : sans cela, deux requêtes parties en même temps — un
   * double-clic suffit — passeraient toutes deux la lecture et créeraient deux lignes.
   * Ici la base tranche, et le second appel corrige le premier au lieu de le doubler.
   *
   * Ni l'identité ni la date de création ne sont figées : se réinscrire après un
   * changement de nom met la ligne à jour, ce qui est bien ce que le bureau veut lire.
   */
  async upsert(
    db: DbOrTx,
    values: typeof clubEventRegistrationsTable.$inferInsert
  ): Promise<ClubEventRegistrationRow> {
    const [row] = await db
      .insert(clubEventRegistrationsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [clubEventRegistrationsTable.eventId, clubEventRegistrationsTable.memberId],
        set: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          guests: values.guests ?? 0,
          updatedAt: values.updatedAt
        }
      })
      .returning();
    return row;
  }
}
