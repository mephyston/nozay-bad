import { type DbOrTx } from '@nba/db';
import { and, or, eq, sql, inArray, isNull, desc, like } from 'drizzle-orm';
import { ledgerEntriesTable, categoriesTable, seasonsTable, bankStatementLinesTable, paymentMethodsTable, seasonBalancesTable } from '../../shared/schema';
import { getMembersByIds } from '@nba/members-api';
import type { ListTransactionsFilters } from './dto';

export class ListTransactionsRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  private async buildConditions(db: DbOrTx, filters: ListTransactionsFilters) {
    const conditions = [];
    if (filters.seasonId) {
      const seasonIdInt = await this.resolveSeasonId(db, filters.seasonId);
      const season = await db.select().from(seasonsTable).where(eq(seasonsTable.id, seasonIdInt)).get();
      if (season) {
        conditions.push(or(
          eq(ledgerEntriesTable.seasonId, seasonIdInt),
          and(
            sql`${ledgerEntriesTable.date} >= ${season.startDate}`,
            sql`${ledgerEntriesTable.date} <= ${season.endDate}`
          )
        ) as any);
      } else {
        conditions.push(eq(ledgerEntriesTable.seasonId, seasonIdInt));
      }
    }
    if (filters.accountId) {
      const accountIdMap: Record<string, number> = { current: 1, savings: 2, cash: 3 };
      const accId = typeof filters.accountId === 'number' ? filters.accountId : accountIdMap[filters.accountId as string] || Number(filters.accountId) || 1;
      conditions.push(or(eq(ledgerEntriesTable.accountId, accId), eq(ledgerEntriesTable.destinationAccountId, accId)) as any);
    }
    if (filters.type) {
      conditions.push(eq(ledgerEntriesTable.type, filters.type as any));
    }
    if (filters.category) {
      conditions.push(eq(ledgerEntriesTable.categoryId, parseInt(filters.category)));
    }
    if (filters.memberId) {
      conditions.push(eq(ledgerEntriesTable.memberId, parseInt(filters.memberId)));
    }
    if (filters.unreconciledChequesOnly) {
      conditions.push(
        eq(ledgerEntriesTable.paymentMethodId, 2),
        isNull(ledgerEntriesTable.bankStatementLineId)
      );
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(or(
        like(ledgerEntriesTable.description, term),
        like(ledgerEntriesTable.reference, term)
      ) as any);
    }
    if (filters.month) {
      conditions.push(like(ledgerEntriesTable.date, `%-${filters.month}-%`));
    }
    return conditions;
  }

  async count(db: DbOrTx, filters: ListTransactionsFilters): Promise<number> {
    const conditions = await this.buildConditions(db, filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptAccountClassId, Number(filters.classCode)), eq(categoriesTable.expenseAccountClassId, Number(filters.classCode))))
        .all();
      const catIds = matchingCats.map((cat) => cat.id);
      if (catIds.length > 0) {
        conditions.push(inArray(ledgerEntriesTable.categoryId, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(ledgerEntriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .get();
    return countRes?.count || 0;
  }

  async list(db: DbOrTx, filters: ListTransactionsFilters, pagination: { limit: number; offset: number }): Promise<any[]> {
    const conditions = await this.buildConditions(db, filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptAccountClassId, Number(filters.classCode)), eq(categoriesTable.expenseAccountClassId, Number(filters.classCode))))
        .all();
      const catIds = matchingCats.map((cat) => cat.id);
      if (catIds.length > 0) {
        conditions.push(inArray(ledgerEntriesTable.categoryId, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    const accountIdMap: Record<string, number> = { current: 1, savings: 2, cash: 3 };
    const accId = filters.accountId 
      ? (typeof filters.accountId === 'number' ? filters.accountId : accountIdMap[filters.accountId as string] || Number(filters.accountId) || 1)
      : 1;

    let initialBalance = 0;
    let seasonStartDate = '';
    if (filters.seasonId) {
      const seasonIdInt = await this.resolveSeasonId(db, filters.seasonId);
      const balanceRow = await db.select({ 
          initialBalanceCents: seasonBalancesTable.initialBalanceCents,
          startDate: seasonsTable.startDate
        })
        .from(seasonBalancesTable)
        .innerJoin(seasonsTable, eq(seasonBalancesTable.seasonId, seasonsTable.id))
        .where(and(eq(seasonBalancesTable.seasonId, seasonIdInt), eq(seasonBalancesTable.accountId, accId)))
        .get();
      if (balanceRow) {
        initialBalance = balanceRow.initialBalanceCents;
        seasonStartDate = balanceRow.startDate;
      }
    }

    const trueInitialBalance = initialBalance;

    const txs = await db.select({
      id: ledgerEntriesTable.id,
      seasonId: ledgerEntriesTable.seasonId,
      type: ledgerEntriesTable.type,
      accountId: ledgerEntriesTable.accountId,
      destinationAccountId: ledgerEntriesTable.destinationAccountId,
      category: categoriesTable.adminLabel,
      amount: ledgerEntriesTable.amountCents,
      date: ledgerEntriesTable.date,
      paymentMethod: paymentMethodsTable.code,
      description: ledgerEntriesTable.description,
      reference: sql<string>`COALESCE(${bankStatementLinesTable.memo}, ${bankStatementLinesTable.name}, ${ledgerEntriesTable.reference})`,
      memberId: ledgerEntriesTable.memberId,
      bankStatementLineId: ledgerEntriesTable.bankStatementLineId,
      runningBalanceCents: sql<number>`CAST(${trueInitialBalance} + COALESCE((
        SELECT SUM(
          CASE
            WHEN le2.type = 'recette' THEN le2.amount_cents
            WHEN le2.type = 'depense' THEN -le2.amount_cents
            WHEN le2.type = 'transfert' AND le2.account_id = ${accId} THEN -le2.amount_cents
            WHEN le2.type = 'transfert' AND le2.destination_account_id = ${accId} THEN le2.amount_cents
            ELSE 0
          END
        )
        FROM ledger_entries le2
        WHERE (le2.account_id = ${accId} OR le2.destination_account_id = ${accId})
          AND (le2.date < ${ledgerEntriesTable.date} OR (le2.date = ${ledgerEntriesTable.date} AND le2.id <= ${ledgerEntriesTable.id}))
          ${seasonStartDate ? sql`AND le2.date >= ${seasonStartDate}` : sql``}
      ), 0) AS INTEGER)`.mapWith(Number)
    })
      .from(ledgerEntriesTable)
      .leftJoin(bankStatementLinesTable, eq(ledgerEntriesTable.bankStatementLineId, bankStatementLinesTable.id))
      .leftJoin(paymentMethodsTable, eq(ledgerEntriesTable.paymentMethodId, paymentMethodsTable.id))
      .leftJoin(categoriesTable, eq(ledgerEntriesTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ledgerEntriesTable.date), desc(ledgerEntriesTable.id))
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all();

    const memberIds = Array.from(new Set(txs.map((t) => t.memberId).filter((id) => id !== null))) as number[];
    const members = await getMembersByIds(db, memberIds);
    const membersMap = new Map(members.map((m) => [m.id, m]));

    return txs.map((t) => {
      const m = t.memberId ? membersMap.get(t.memberId) : null;
      return {
        ...t,
        memberName: m ? `${m.lastName} ${m.firstName}` : null,
        memberLicence: m ? m.licence : null
      };
    });
  }
}
