import { internalTransfersTable, ledgerEntriesTable, seasonsTable } from '../../shared/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';

export interface TransferLegRow {
  id: number;
  seasonId: number;
  accountId: number;
  transferLeg: 'source' | 'destination' | null;
  amountCents: number;
  date: string;
  bankStatementLineId: number | null;
}

export interface TransferLegUpdate {
  seasonId: number;
  accountId: number;
  amountCents: number;
  date: string;
  description: string;
  reference: string | null;
}

export class UpdateInternalTransferRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number | null> {
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, String(seasonIdOrCode))).get();
    return row?.id ?? null;
  }

  async getById(db: DbOrTx, id: number): Promise<{ transfer: any; legs: TransferLegRow[] } | null> {
    const transfer = await db.select().from(internalTransfersTable).where(eq(internalTransfersTable.id, id)).get();
    if (!transfer) return null;
    const legs = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.transferId, id)).all()) as TransferLegRow[];
    return { transfer, legs };
  }

  buildUpdateTransferStatement(db: DbOrTx, id: number, values: { seasonId: number; amountCents: number; description: string }): any {
    return db.update(internalTransfersTable).set(values).where(eq(internalTransfersTable.id, id));
  }

  /*
   * Le statut et le pointage d'une jambe ne sont pas touchés : la banque a parlé, une
   * correction de libellé ne défait pas ce constat — même règle qu'au grand livre.
   */
  buildUpdateLegStatement(db: DbOrTx, legId: number, values: TransferLegUpdate): any {
    return db.update(ledgerEntriesTable).set(values).where(eq(ledgerEntriesTable.id, legId));
  }
}
