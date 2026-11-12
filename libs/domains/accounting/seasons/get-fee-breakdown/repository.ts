import { type DbOrTx } from '@nba/db';
import { sql } from 'drizzle-orm';
import type { AmountRow, CategoryRef, RubriqueRef } from './dto';

export interface SeasonRef { id: number; code: string; startDate: string }

export class GetFeeBreakdownRepository {
  /** La saison demandée par son code, sinon l'active. */
  async findSeason(db: DbOrTx, code?: string): Promise<SeasonRef | undefined> {
    const row = code
      ? await db.get<{ id: number; code: string; start_date: string }>(sql`SELECT id, code, start_date FROM seasons WHERE code = ${code}`)
      : await db.get<{ id: number; code: string; start_date: string }>(sql`SELECT id, code, start_date FROM seasons WHERE active = 1 ORDER BY id DESC LIMIT 1`);
    return row ? { id: row.id, code: row.code, startDate: row.start_date } : undefined;
  }

  /** La saison qui précède, à la date de début : les codes ne se suivent pas forcément. */
  async findPreviousSeason(db: DbOrTx, startDate: string): Promise<SeasonRef | undefined> {
    const row = await db.get<{ id: number; code: string; start_date: string }>(
      sql`SELECT id, code, start_date FROM seasons WHERE start_date < ${startDate} ORDER BY start_date DESC LIMIT 1`
    );
    return row ? { id: row.id, code: row.code, startDate: row.start_date } : undefined;
  }

  async budgetRows(db: DbOrTx, seasonId: number): Promise<AmountRow[]> {
    const rows = await db.all<{ category_id: number; type: AmountRow['type']; cents: number }>(sql`
      SELECT category_id, type, amount_cents AS cents
      FROM season_category_budgets
      WHERE season_id = ${seasonId} AND amount_cents <> 0
    `);
    return rows.map((r) => ({ categoryId: r.category_id, type: r.type, cents: r.cents }));
  }

  /**
   * Le réalisé d'une saison par catégorie : produits et charges seulement. Les jambes de
   * virement (`transfert`) ne créent pas d'argent, elles en déplacent.
   */
  async realisedRows(db: DbOrTx, seasonId: number): Promise<AmountRow[]> {
    const rows = await db.all<{ category_id: number | null; type: AmountRow['type']; cents: number }>(sql`
      SELECT category_id, type, SUM(amount_cents) AS cents
      FROM ledger_entries
      WHERE season_id = ${seasonId} AND type IN ('recette', 'depense')
      GROUP BY category_id, type
    `);
    return rows.map((r) => ({ categoryId: r.category_id, type: r.type, cents: r.cents }));
  }

  async categories(db: DbOrTx): Promise<CategoryRef[]> {
    const rows = await db.all<{ id: number; admin_label: string; adherent_label: string; rubrique_id: number | null }>(
      sql`SELECT id, admin_label, adherent_label, rubrique_id FROM categories`
    );
    return rows.map((r) => ({ id: r.id, adminLabel: r.admin_label, adherentLabel: r.adherent_label, rubriqueId: r.rubrique_id }));
  }

  async rubriques(db: DbOrTx): Promise<RubriqueRef[]> {
    const rows = await db.all<{ id: number; label: string; position: number; membership_fees: number }>(
      sql`SELECT id, label, position, membership_fees FROM category_groups WHERE kind = 'rubrique'`
    );
    return rows.map((r) => ({ id: r.id, label: r.label, position: r.position, membershipFees: !!r.membership_fees }));
  }
}
