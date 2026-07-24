import { type DbOrTx } from '@nba/db';
import { eq, and, desc } from 'drizzle-orm';
import { checksTable, checkDepositsTable, seasonsTable } from '../../shared/schema';
import { getMembersByIds } from '@nba/members-api';

export class ListChecksRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async listChecks(db: DbOrTx, seasonId: string, status?: string) {
    const seasonIdInt = await this.resolveSeasonId(db, seasonId);
    const conditions = [eq(checksTable.seasonId, seasonIdInt)];
    if (status) {
      conditions.push(eq(checksTable.status, status as any));
    }
    const checks = await db.select({
      id: checksTable.id,
      checkDepositId: checksTable.checkDepositId,
      seasonId: checksTable.seasonId,
      number: checksTable.number,
      amount: checksTable.amountCents,
      emitter: checksTable.emitter,
      bank: checksTable.bank,
      memberId: checksTable.memberId,
      ledgerEntryId: checksTable.ledgerEntryId,
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
    const seasonIdInt = await this.resolveSeasonId(db, seasonId);
    return db.select()
      .from(checkDepositsTable)
      .where(eq(checkDepositsTable.seasonId, seasonIdInt))
      .orderBy(desc(checkDepositsTable.date), desc(checkDepositsTable.id))
      .all();
  }
}
