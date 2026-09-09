import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { scheduleSlotsTable, type ScheduleSlotRow } from '../../shared/schema';
import { indivSessionsTable } from '../../shared/indiv-schema';

export class GenerateIndivSessionsRepository {
  /**
   * Les créneaux compétiteurs **actifs** — c'est au début de ceux-là que l'indiv se tient.
   * Un créneau masqué de la grille ne produit pas de soirée.
   */
  async competitionSlots(db: DbOrTx, slotIds?: number[]): Promise<ScheduleSlotRow[]> {
    const where = [
      eq(scheduleSlotsTable.audience, 'adultes_competition'),
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
