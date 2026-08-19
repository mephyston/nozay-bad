import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountsTable, paymentMethodsTable } from '../shared/schema';

export async function getAccountByCode(db: DbOrTx, code: string): Promise<typeof accountsTable.$inferSelect | undefined> {
  return db.select().from(accountsTable).where(eq(accountsTable.code, code)).get();
}

export async function getPaymentMethodById(db: DbOrTx, id: number): Promise<typeof paymentMethodsTable.$inferSelect | undefined> {
  return db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, id)).get();
}

export async function getPaymentMethodByCode(db: DbOrTx, code: string): Promise<typeof paymentMethodsTable.$inferSelect | undefined> {
  return db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.code, code)).get();
}
