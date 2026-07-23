import { type DbOrTx } from '@metacult/shared-db';
import { eq, and, desc } from 'drizzle-orm';
import { checksTable, checkDepositsTable } from '../../shared/schema';
import { getMembersByIds } from '@metacult/features-members-api';

export class ListChecksRepository {
  async listChecks(db: DbOrTx, seasonId: string, status?: string) {
    const conditions = [eq(checksTable.seasonId, seasonId)];
    if (status) {
      conditions.push(eq(checksTable.status, status as any));
    }
    const checks = await db.select({
      id: checksTable.id,
      checkDepositId: checksTable.checkDepositId,
      seasonId: checksTable.seasonId,
      number: checksTable.number,
      amount: checksTable.amount,
      emitter: checksTable.emitter,
      bank: checksTable.bank,
      memberId: checksTable.memberId,
      transactionId: checksTable.transactionId,
      status: checksTable.status,
      photoUrl: checksTable.photoUrl,
      createdAt: checksTable.createdAt
    })
      .from(checksTable)
      .where(and(...conditions))
      .orderBy(desc(checksTable.createdAt))
      .all();

    const memberIds = Array.from(new Set(checks.map((c) => c.memberId).filter((id) => id !== null))) as number[];
    const members = await getMembersByIds(db, memberIds);
    const membersMap = new Map(members.map((m) => [m.id, m]));

    return checks.map((c) => {
      const m = c.memberId ? membersMap.get(c.memberId) : null;
      return {
        ...c,
        memberName: m ? `${m.lastName} ${m.firstName}` : null,
        memberLicence: m ? m.licence : null
      };
    });
  }

  async listCheckDeposits(db: DbOrTx, seasonId: string) {
    return db.select()
      .from(checkDepositsTable)
      .where(eq(checkDepositsTable.seasonId, seasonId))
      .orderBy(desc(checkDepositsTable.date), desc(checkDepositsTable.id))
      .all();
  }
}
