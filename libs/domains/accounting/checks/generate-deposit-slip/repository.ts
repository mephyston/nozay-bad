import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { getMembersByIds } from '@nba/members-api';
import { checksTable, checkDepositsTable } from '../../shared/schema';
import type { DepositSlipData } from './generate-deposit-slip-pdf';

export class GenerateDepositSlipRepository {
  /** Le bordereau et ses chèques, dans l'ordre d'enregistrement, avec le nom de l'adhérent rattaché. */
  async getDepositWithChecks(db: DbOrTx, id: number): Promise<DepositSlipData | undefined> {
    const deposit = await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, id)).get();
    if (!deposit) return undefined;

    const checks = await db
      .select({
        number: checksTable.number,
        emitter: checksTable.emitter,
        bank: checksTable.bank,
        memberId: checksTable.memberId,
        amountCents: checksTable.amountCents
      })
      .from(checksTable)
      .where(eq(checksTable.checkDepositId, id))
      .orderBy(asc(checksTable.id))
      .all();

    const memberIds = Array.from(new Set(checks.map((c) => c.memberId).filter((m): m is number => m !== null)));
    const members = await getMembersByIds(db, memberIds);
    const names = new Map(members.map((m) => [m.id, `${m.lastName} ${m.firstName}`]));

    return {
      reference: deposit.reference,
      date: deposit.date,
      amountCents: deposit.amountCents,
      status: deposit.status,
      checks: checks.map((c) => ({
        number: c.number,
        emitter: c.emitter,
        bank: c.bank,
        memberName: c.memberId ? (names.get(c.memberId) ?? null) : null,
        amountCents: c.amountCents
      }))
    };
  }
}
