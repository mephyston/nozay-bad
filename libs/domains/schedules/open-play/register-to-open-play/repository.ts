import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  openPlayGuestsTable,
  openPlayRegistrationsTable,
  openPlaySessionsTable,
  type OpenPlayRegistrationRow,
  type OpenPlaySessionRow
} from '../../shared/open-play-schema';
import type { GuestName } from './dto';

export class RegisterToOpenPlayRepository {
  async findSession(db: DbOrTx, id: number): Promise<OpenPlaySessionRow | undefined> {
    return db.select().from(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, id)).get();
  }

  /**
   * Les instructions qui inscrivent — ou mettent à jour — et **remplacent** la liste
   * d'invités. Le lot lui-même est exécuté par le handler, phase 3 du motif de
   * l'ADR-0005 : le repository construit, le handler écrit.
   *
   * Trois choses se jouent ici.
   *
   * L'upsert s'appuie sur l'index unique `(session_id, member_id)` plutôt que sur un
   * « lire puis décider » : sans cela, deux requêtes parties en même temps — un
   * double-clic suffit — passeraient toutes deux la lecture et créeraient deux lignes.
   *
   * Le rattachement des invités passe par une **sous-requête sur la clé naturelle du
   * parent** (ADR-0005 § 2.2, option A′), et non par `last_insert_rowid()`. Ce dernier
   * désigne la dernière ligne insérée *toutes tables confondues* : il ne vaut que si le
   * parent n'est suivi que d'un seul enfant, et devient faux dès le deuxième invité, qui
   * référencerait l'id du premier. Sur une base neuve les deux séquences d'id coïncident
   * et masquent le défaut — c'est ce que le test de dérive vérifie.
   *
   * Le `DELETE` doit rester **avant** les insertions : après elles, il effacerait les
   * invités qu'on vient d'écrire. C'est ce remplacement en bloc qui porte l'idempotence,
   * plutôt qu'un rapprochement ligne à ligne qui demanderait une identité stable que
   * deux prénoms n'ont pas.
   */
  buildUpsertStatements(
    db: DbOrTx,
    values: typeof openPlayRegistrationsTable.$inferInsert,
    guests: GuestName[]
  ): unknown[] {
    const t = openPlayRegistrationsTable;
    const parentId = sql`(SELECT ${t.id} FROM ${t} WHERE ${t.sessionId} = ${values.sessionId} AND ${t.memberId} = ${values.memberId})`;

    return [
      db
        .insert(t)
        .values(values)
        .onConflictDoUpdate({
          target: [t.sessionId, t.memberId],
          set: {
            licence: values.licence,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            updatedAt: values.updatedAt
          }
        }),
      db.delete(openPlayGuestsTable).where(eq(openPlayGuestsTable.registrationId, parentId)),
      ...guests.map((guest) =>
        db.insert(openPlayGuestsTable).values({
          registrationId: parentId as never,
          firstName: guest.firstName,
          lastName: guest.lastName,
          createdAt: values.createdAt
        })
      )
    ];
  }

  async findWithGuests(
    db: DbOrTx,
    sessionId: number,
    memberId: number
  ): Promise<(OpenPlayRegistrationRow & { guests: GuestName[] }) | undefined> {
    const registration = await db
      .select()
      .from(openPlayRegistrationsTable)
      .where(
        and(
          eq(openPlayRegistrationsTable.sessionId, sessionId),
          eq(openPlayRegistrationsTable.memberId, memberId)
        )
      )
      .get();
    if (!registration) return undefined;

    const guests = await db
      .select({
        firstName: openPlayGuestsTable.firstName,
        lastName: openPlayGuestsTable.lastName
      })
      .from(openPlayGuestsTable)
      .where(eq(openPlayGuestsTable.registrationId, registration.id))
      .all();

    return { ...registration, guests };
  }
}
