import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { championshipDaysTable, type ChampionshipDayRow } from '../shared/schema';

export class SaveChampionshipDaysRepository {
  async listExisting(
    db: DbOrTx,
    seasonCode: string,
    championship: ChampionshipDayRow['championship']
  ): Promise<ChampionshipDayRow[]> {
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          eq(championshipDaysTable.championship, championship)
        )
      )
      .all();
  }

  /**
   * Écrit le calendrier journée par journée, sur la clé `(saison, championnat, numéro)`.
   *
   * On n'efface pas pour réécrire : les rencontres et leurs compositions référencent
   * `championship_days.id` avec un `ON DELETE CASCADE`. Supprimer une journée pour la
   * recréer à l'identique effacerait au passage toutes les compositions saisies par les
   * capitaines — un simple ajustement de date en fin de saison deviendrait destructeur.
   */
  async upsert(
    db: DbOrTx,
    values: typeof championshipDaysTable.$inferInsert
  ): Promise<ChampionshipDayRow> {
    const [row] = await db
      .insert(championshipDaysTable)
      .values(values)
      .onConflictDoUpdate({
        target: [
          championshipDaysTable.seasonCode,
          championshipDaysTable.championship,
          championshipDaysTable.number
        ],
        set: {
          weekStart: values.weekStart,
          weekEnd: values.weekEnd,
          matchDate: values.matchDate ?? null,
          kind: values.kind ?? 'regular',
          label: values.label ?? null,
          referenceEloDate: values.referenceEloDate ?? null
        }
      })
      .returning();
    return row;
  }

  /** Retire les journées que le calendrier soumis ne contient plus. */
  async removeMissing(
    db: DbOrTx,
    seasonCode: string,
    championship: ChampionshipDayRow['championship'],
    keptNumbers: number[]
  ): Promise<void> {
    const existing = await this.listExisting(db, seasonCode, championship);
    const kept = new Set(keptNumbers);

    for (const row of existing) {
      if (!kept.has(row.number)) {
        await db.delete(championshipDaysTable).where(eq(championshipDaysTable.id, row.id));
      }
    }
  }
}
