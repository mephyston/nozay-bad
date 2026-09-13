import { AppError, type Db } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountsTable, paymentMethodsTable, type PaymentMethodKind } from '../../shared/schema';

type EntryStatus = 'cleared' | 'in_vault' | 'pending_debit';

export interface CreatePaymentMethodInput {
  code: string;
  label: string;
  kind: PaymentMethodKind;
  defaultAccountCode: string;
  defaultEntryStatus: EntryStatus;
  storefront?: boolean;
}

export interface UpdatePaymentMethodInput {
  label?: string;
  kind?: PaymentMethodKind;
  defaultAccountCode?: string;
  defaultEntryStatus?: EntryStatus;
  active?: boolean;
  storefront?: boolean;
}

/** Le compte que le moyen crédite par défaut : un compte de trésorerie actif. */
async function accountId(db: Db, code: string): Promise<number> {
  const account = await db.select().from(accountsTable).where(eq(accountsTable.code, code)).get();
  if (!account || account.kind === 'third_party') throw new AppError(`Compte « ${code} » inconnu.`, 400);
  if (!account.active) throw new AppError(`Le compte « ${account.label} » est inactif.`, 400);
  return account.id;
}

export async function createPaymentMethod(db: Db, input: CreatePaymentMethodInput, now: Date = new Date()) {
  const existing = await db.select({ id: paymentMethodsTable.id }).from(paymentMethodsTable).where(eq(paymentMethodsTable.code, input.code)).get();
  if (existing) throw new AppError(`Un moyen de paiement porte déjà le code « ${input.code} ».`, 409);
  return db
    .insert(paymentMethodsTable)
    .values({
      code: input.code,
      label: input.label.trim(),
      kind: input.kind,
      defaultAccountId: await accountId(db, input.defaultAccountCode),
      defaultEntryStatus: input.defaultEntryStatus,
      active: true,
      storefront: input.storefront ?? true,
      createdAt: now
    })
    .returning()
    .get();
}

export async function updatePaymentMethod(db: Db, id: number, input: UpdatePaymentMethodInput) {
  const current = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, id)).get();
  if (!current) throw new AppError('Moyen de paiement introuvable.', 404);
  // Le virement interne est technique : il porte les deux jambes d'un virement entre
  // comptes, et ne se règle pas — le rendre inactif casserait tous les virements.
  if (current.kind === 'internal') throw new AppError('Le virement interne ne se modifie pas.', 400);

  const values: Partial<typeof paymentMethodsTable.$inferInsert> = {};
  if (input.label !== undefined) values.label = input.label.trim();
  if (input.kind !== undefined) values.kind = input.kind;
  if (input.defaultEntryStatus !== undefined) values.defaultEntryStatus = input.defaultEntryStatus;
  if (input.active !== undefined) values.active = input.active;
  if (input.storefront !== undefined) values.storefront = input.storefront;
  if (input.defaultAccountCode !== undefined) values.defaultAccountId = await accountId(db, input.defaultAccountCode);

  return db.update(paymentMethodsTable).set(values).where(eq(paymentMethodsTable.id, id)).returning().get();
}
