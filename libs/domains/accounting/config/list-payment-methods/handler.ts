import { type DbOrTx } from '@nba/db';
import { eq, sql } from 'drizzle-orm';
import { accountsTable, ledgerEntriesTable, paymentMethodsTable, type PaymentMethodKind } from '../../shared/schema';

export interface PaymentMethodView {
  id: number;
  code: string;
  label: string;
  kind: PaymentMethodKind;
  active: boolean;
  storefront: boolean;
  defaultAccountId: number;
  defaultAccountCode: string;
  defaultEntryStatus: 'cleared' | 'in_vault' | 'pending_debit';
  /** Écritures du grand livre qui y renvoient : un moyen référencé ne se supprime pas. */
  ledgerUses: number;
}

export interface ListPaymentMethodsOptions {
  /** Ne rendre que ce qu'on propose : actifs, et visibles de la boutique si `storefront`. */
  offered?: 'admin' | 'storefront';
}

/**
 * Les moyens de paiement du club.
 *
 * `offered: 'admin'` rend ce qu'un formulaire d'administration propose (actifs, hors
 * virement interne) ; `'storefront'` ce que la boutique propose aux adhérents ; sans
 * option, tout, avec l'usage — l'écran de configuration a besoin de savoir ce qui se
 * supprime encore.
 */
export async function listPaymentMethods(db: DbOrTx, options: ListPaymentMethodsOptions = {}): Promise<PaymentMethodView[]> {
  const rows = await db
    .select({
      id: paymentMethodsTable.id,
      code: paymentMethodsTable.code,
      label: paymentMethodsTable.label,
      kind: paymentMethodsTable.kind,
      active: paymentMethodsTable.active,
      storefront: paymentMethodsTable.storefront,
      defaultAccountId: paymentMethodsTable.defaultAccountId,
      defaultAccountCode: accountsTable.code,
      defaultEntryStatus: paymentMethodsTable.defaultEntryStatus,
      ledgerUses: sql<number>`(SELECT COUNT(*) FROM ${ledgerEntriesTable} WHERE ${ledgerEntriesTable.paymentMethodId} = ${paymentMethodsTable.id})`.mapWith(Number)
    })
    .from(paymentMethodsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, paymentMethodsTable.defaultAccountId))
    .orderBy(paymentMethodsTable.id)
    .all();

  return rows.filter((r) => {
    if (!options.offered) return true;
    if (!r.active || r.kind === 'internal') return false;
    return options.offered === 'admin' || r.storefront;
  });
}
