import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { checksTable, checkDepositsTable } from '../../shared/schema';
import type { DepositSlipData } from './generate-deposit-slip-pdf';

export class GenerateDepositSlipRepository {
  /** Le bordereau et ses chèques, dans l'ordre d'enregistrement. L'adhérent rattaché n'y figure pas : la banque n'en a que faire. */
  async getDepositWithChecks(db: DbOrTx, id: number): Promise<DepositSlipData | undefined> {
    const deposit = await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, id)).get();
    if (!deposit) return undefined;

    const checks = await db
      .select({
        number: checksTable.number,
        emitter: checksTable.emitter,
        bank: checksTable.bank,
        amountCents: checksTable.amountCents
      })
      .from(checksTable)
      .where(eq(checksTable.checkDepositId, id))
      .orderBy(asc(checksTable.id))
      .all();

    return {
      reference: deposit.reference,
      date: deposit.date,
      amountCents: deposit.amountCents,
      status: deposit.status,
      checks: checks.map((c) => ({
        number: c.number,
        emitter: c.emitter,
        bank: c.bank,
        amountCents: c.amountCents
      }))
    };
  }
}
