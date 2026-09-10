import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { scheduleSlotsTable, type ScheduleSlotRow } from '../../shared/schema';
import { indivSessionsTable } from '../../shared/indiv-schema';

export class GenerateIndivSessionsRepository {
  /**
   * Les créneaux marqués « séances individuelles » et **actifs**.
   *
   * Le public ne suffisait pas : sur les quatre créneaux compétiteurs de la grille, deux
   * seulement ouvrent des indiv (mardi 19 h 30, mercredi 19 h 30), et la génération
   * proposait les quatre. Un créneau masqué de la grille ne produit pas de soirée.
   */
  async indivSlots(db: DbOrTx, slotIds?: number[]): Promise<ScheduleSlotRow[]> {
    const where = [
      eq(scheduleSlotsTable.indiv, true),
      eq(scheduleSlotsTable.active, true),
      slotIds?.length ? inArray(scheduleSlotsTable.id, slotIds) : undefined
    ].filter(Boolean);

    return db
      .select()
      .from(scheduleSlotsTable)
      .where(and(...where))
      .all();
  }

  /**
   * `ON CONFLICT DO NOTHING`, et surtout pas `DO UPDATE` : la mise à jour remettrait
   * `status` à `open` sur une soirée dont les retenus sont déjà annoncés.
   */
  buildInsert(db: DbOrTx, values: typeof indivSessionsTable.$inferInsert) {
    return db
      .insert(indivSessionsTable)
      .values(values)
      .onConflictDoNothing({
        target: [indivSessionsTable.date, indivSessionsTable.venueId, indivSessionsTable.startTime]
      });
  }
}
