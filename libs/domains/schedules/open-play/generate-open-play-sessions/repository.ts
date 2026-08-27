import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { scheduleSlotsTable, type ScheduleSlotRow } from '../../shared/schema';
import { openPlaySessionsTable } from '../../shared/open-play-schema';

export class GenerateOpenPlaySessionsRepository {
  /**
   * Les créneaux de jeu libre **actifs**.
   *
   * Un créneau masqué du site n'a pas à produire de séances : le masquer est justement
   * la façon dont le bureau retire un horaire qu'il ne tient plus. C'est aussi le seul
   * filtre qui reste — un créneau ne porte plus de saison, seule la période demandée
   * borne la génération.
   */
  async openPlaySlots(db: DbOrTx, slotIds?: number[]): Promise<ScheduleSlotRow[]> {
    const where = [
      eq(scheduleSlotsTable.audience, 'jeu_libre'),
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
   * L'instruction d'insertion d'une séance, à passer au lot.
   *
   * `ON CONFLICT DO NOTHING` sur la clé naturelle, et surtout **pas** `DO UPDATE` : la
   * mise à jour remettrait `status` à `open` et effacerait l'ouvreur d'une séance déjà
   * confirmée. Rejouer une période doit être sans effet, pas destructeur.
   */
  buildInsert(db: DbOrTx, values: typeof openPlaySessionsTable.$inferInsert) {
    return db
      .insert(openPlaySessionsTable)
      .values(values)
      .onConflictDoNothing({
        target: [
          openPlaySessionsTable.date,
          openPlaySessionsTable.venueId,
          openPlaySessionsTable.startTime
        ]
      });
  }
}
