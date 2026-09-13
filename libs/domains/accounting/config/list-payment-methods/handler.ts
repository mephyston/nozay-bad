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
  /**
   * Écritures du grand livre qui y renvoient : un moyen référencé ne se supprime pas.
   * Compté pour la seule liste complète (l'écran de configuration) : les formulaires qui
   * demandent ce qui est `offered` n'en ont pas besoin, et ce comptage lit `ledger_entries`,
   * la plus grosse table de la base.
   */
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
      defaultEntryStatus: paymentMethodsTable.defaultEntryStatus
    })
    .from(paymentMethodsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, paymentMethodsTable.defaultAccountId))
    .orderBy(paymentMethodsTable.id)
    .all();

  if (options.offered) {
    return rows
      .filter((r) => r.active && r.kind !== 'internal' && (options.offered === 'admin' || r.storefront))
      .map((r) => ({ ...r, ledgerUses: 0 }));
  }

  // Une seule lecture groupée, sur l'index `ledger_entries_payment_method_idx` — et non
  // une sous-requête par moyen, qui parcourait la table entière dix fois.
  const uses = await db
    .select({ paymentMethodId: ledgerEntriesTable.paymentMethodId, n: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(ledgerEntriesTable)
    .groupBy(ledgerEntriesTable.paymentMethodId)
    .all();
  const byMethod = new Map(uses.map((u) => [u.paymentMethodId, u.n]));
  return rows.map((r) => ({ ...r, ledgerUses: byMethod.get(r.id) ?? 0 }));
}
