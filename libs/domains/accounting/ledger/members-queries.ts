import { type DbOrTx } from '@nba/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ledgerEntriesTable, paymentMethodsTable } from '../shared/schema';

export async function getMemberLastPaymentTransaction(db: DbOrTx, memberId: number): Promise<{ paymentMethod: string; date: string } | undefined> {
  const row = await db.select({
    paymentMethod: paymentMethodsTable.label,
    date: ledgerEntriesTable.date
  })
    .from(ledgerEntriesTable)
    .leftJoin(paymentMethodsTable, eq(ledgerEntriesTable.paymentMethodId, paymentMethodsTable.id))
    .where(and(eq(ledgerEntriesTable.memberId, memberId), eq(ledgerEntriesTable.type, 'recette')))
    .orderBy(desc(ledgerEntriesTable.date))
    .limit(1)
    .get();

  // Le libellé du moyen, tel que le club l'a nommé ; « virement » à défaut, pour l'attestation.
  return row ? { paymentMethod: row.paymentMethod || 'virement', date: row.date } : undefined;
}

export async function getMemberTotalPayments(db: DbOrTx, memberId: number, seasonId: number): Promise<number> {
  const row = await db.select({
    total: sql<number>`sum(${ledgerEntriesTable.amountCents})`
  })
    .from(ledgerEntriesTable)
    .where(and(
      eq(ledgerEntriesTable.memberId, memberId),
      eq(ledgerEntriesTable.seasonId, seasonId),
      eq(ledgerEntriesTable.status, 'cleared'),
      eq(ledgerEntriesTable.type, 'recette')
    ))
    .get();

  return row?.total || 0;
}
