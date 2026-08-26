import { seasonsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, inArray, sql } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

export class ListInvoicesRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async list(db: DbOrTx, seasonId?: any): Promise<any[]> {
    if (!seasonId) {
      return db.select().from(invoicesTable).all();
    }
    const idVal = typeof seasonId === 'object' ? seasonId.seasonId : seasonId;
    if (!idVal) return db.select().from(invoicesTable).all();
    const seasonIdInt = await this.resolveSeasonId(db, idVal);
    return db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, seasonIdInt)).all();
  }

  /**
   * Ce que chaque facture encaissera, et sous quelle imputation.
   *
   * L'écran de rapprochement en a besoin pour préremplir l'écriture : sans elle, il posait la
   * catégorie « Adhésions & Inscriptions » en dur sur toute recette de facturation. Le
   * regroupement se fait en SQL — une facture mêlant deux catégories donne deux parts, et donc
   * une ventilation, ce que le modèle sait déjà écrire.
   *
   * Une ligne sans catégorie ressort avec `categoryId: null` : elle est due, mais la comptable
   * devra la choisir.
   */
  async listCategoryBreakdown(db: DbOrTx, invoiceIds: number[]): Promise<Map<number, { categoryId: number | null; amountCents: number }[]>> {
    const byInvoice = new Map<number, { categoryId: number | null; amountCents: number }[]>();
    if (invoiceIds.length === 0) return byInvoice;

    const rows = await db.select({
        invoiceId: invoiceItemsTable.invoiceId,
        categoryId: invoiceItemsTable.categoryId,
        amountCents: sql<number>`SUM(${invoiceItemsTable.totalPriceCents})`.mapWith(Number)
      })
      .from(invoiceItemsTable)
      .where(inArray(invoiceItemsTable.invoiceId, invoiceIds))
      .groupBy(invoiceItemsTable.invoiceId, invoiceItemsTable.categoryId)
      .all();

    for (const row of rows) {
      if (!byInvoice.has(row.invoiceId)) byInvoice.set(row.invoiceId, []);
      byInvoice.get(row.invoiceId)!.push({ categoryId: row.categoryId, amountCents: row.amountCents });
    }
    return byInvoice;
  }
}
