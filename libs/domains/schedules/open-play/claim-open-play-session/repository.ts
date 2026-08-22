import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  openPlayOpenersTable,
  openPlaySessionsTable,
  type OpenPlaySessionRow
} from '../../shared/open-play-schema';

export class ClaimOpenPlaySessionRepository {
  async findSession(db: DbOrTx, id: number): Promise<OpenPlaySessionRow | undefined> {
    return db.select().from(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, id)).get();
  }

  async isOpener(db: DbOrTx, seasonCode: string, licence: string): Promise<boolean> {
    const row = await db
      .select({ id: openPlayOpenersTable.id })
      .from(openPlayOpenersTable)
      .where(
        and(
          eq(openPlayOpenersTable.seasonCode, seasonCode),
          eq(openPlayOpenersTable.licence, licence)
        )
      )
      .get();
    return Boolean(row);
  }

  /**
   * Prend la séance, **si elle est encore libre** — verrou optimiste (ADR-0005 § 2.3).
   *
   * La condition est dans le `WHERE`, et non dans une lecture préalable : entre un
   * « la séance est-elle libre ? » et l'écriture, deux bénévoles qui cliquent en même
   * temps passeraient tous deux la lecture, et le second écraserait le premier sans que
   * personne ne le sache. Ici la base tranche, et l'absence de ligne modifiée le dit.
   *
   * `opener_licence = ?` dans la condition rend l'opération idempotente : reprendre une
   * séance qu'on ouvre déjà n'est pas une erreur.
   */
  async claim(
    db: DbOrTx,
    sessionId: number,
    values: { licence: string; firstName: string; lastName: string; now: Date }
  ): Promise<OpenPlaySessionRow | undefined> {
    const [row] = await db
      .update(openPlaySessionsTable)
      .set({
        openerLicence: values.licence,
        openerFirstName: values.firstName,
        openerLastName: values.lastName,
        openedAt: values.now,
        status: 'confirmed',
        updatedAt: values.now
      })
      .where(
        and(
          eq(openPlaySessionsTable.id, sessionId),
          or(
            isNull(openPlaySessionsTable.openerLicence),
            eq(openPlaySessionsTable.openerLicence, values.licence)
          )
        )
      )
      .returning();
    return row;
  }
}
