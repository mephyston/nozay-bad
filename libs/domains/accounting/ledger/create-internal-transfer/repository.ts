import { internalTransfersTable, ledgerEntriesTable, seasonsTable } from '../../shared/schema';
import { type DbOrTx } from '@nba/db';
import { eq, like, sql } from 'drizzle-orm';

export interface TransferLegValues {
  seasonId: number;
  accountId: number;
  transferLeg: 'source' | 'destination';
  amountCents: number;
  date: string;
  paymentMethodId: number;
  description: string;
  reference: string | null;
  createdAt: Date;
}

export class CreateInternalTransferRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  /**
   * Le prochain numéro libre pour un exercice, calculé avant le batch.
   *
   * `reference` est en UNIQUE : deux saisies simultanées se disputeraient le même numéro et la
   * seconde échouerait franchement, plutôt que d'écrire un doublon. C'est le comportement voulu —
   * une collision est rare et rejouable, un virement en double ne l'est pas.
   */
  async nextSequence(db: DbOrTx, seasonCode: string): Promise<number> {
    const rows = await db
      .select({ reference: internalTransfersTable.reference })
      .from(internalTransfersTable)
      .where(like(internalTransfersTable.reference, `VIR-${seasonCode}-%`))
      .all();
    const highest = rows.reduce((max, r) => {
      const n = Number(r.reference.split('-').pop());
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return highest + 1;
  }

  buildCreateTransferStatement(db: DbOrTx, values: {
    seasonId: number; reference: string; amountCents: number; description: string; createdAt: Date;
  }): any {
    return db.insert(internalTransfersTable).values(values);
  }

  /**
   * Une jambe, rattachée à son virement **par sa référence** et non par son identifiant.
   *
   * `last_insert_rowid()` ne désigne qu'un seul enfant ; un virement en a deux, et les trois
   * ordres partent dans le même `db.batch()` — donc avant que le moindre identifiant ne soit
   * connu. La clé naturelle est le seul rattachement possible ici.
   */
  buildCreateLegStatement(db: DbOrTx, transferReference: string, leg: TransferLegValues): any {
    return db.insert(ledgerEntriesTable).values({
      seasonId: leg.seasonId,
      type: 'transfert',
      accountId: leg.accountId,
      transferId: sql`(SELECT ${internalTransfersTable.id} FROM ${internalTransfersTable} WHERE ${internalTransfersTable.reference} = ${transferReference})` as any,
      transferLeg: leg.transferLeg,
      categoryId: null,
      amountCents: leg.amountCents,
      date: leg.date,
      paymentMethodId: leg.paymentMethodId,
      description: leg.description,
      reference: leg.reference,
      accrualType: 'normal',
      accrualNote: null,
      memberId: null,
      bankStatementLineId: null,
      invoiceId: null,
      status: 'cleared',
      createdAt: leg.createdAt
    });
  }

  async getByReference(db: DbOrTx, reference: string): Promise<any> {
    const transfer = await db.select().from(internalTransfersTable).where(eq(internalTransfersTable.reference, reference)).get();
    if (!transfer) return null;
    const legs = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.transferId, transfer.id)).all();
    return { transfer, legs };
  }

  async getSeasonCode(db: DbOrTx, seasonId: number): Promise<string> {
    const row = await db.select({ code: seasonsTable.code }).from(seasonsTable).where(eq(seasonsTable.id, seasonId)).get();
    return row?.code ?? String(seasonId);
  }
}
