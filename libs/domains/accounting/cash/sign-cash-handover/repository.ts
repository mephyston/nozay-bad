import { type Db } from '@nba/db';
import { and, eq, ne, sql } from 'drizzle-orm';
import { cashHandoversTable, cashReceiptsTable, ledgerEntriesTable } from '../../shared/schema';
import type { CashHandoverRow } from '../../shared/cash-store';

/** Une écriture à passer, colonne à colonne. */
export interface CashEntry {
  seasonId: number;
  type: 'recette' | 'depense';
  accountId: number;
  paymentMethodId: number;
  categoryId: number;
  amountCents: number;
  date: string;
  description: string;
  reference: string;
  memberId: number | null;
  status: 'cleared' | 'in_vault' | 'pending_debit';
  createdAt: Date;
}

export class SignCashHandoverRepository {
  /**
   * Scelle la remise et passe ses écritures d'un seul lot — une transaction D1.
   *
   * Garde contre la double signature (QR code et doigt en même temps) : la première
   * instruction ne touche la remise que si elle n'est **plus** en attente, et lui donne
   * alors un montant compté négatif, que la contrainte `cash_handovers_counted_check`
   * refuse. Le lot entier échoue, rien n'est écrit deux fois. Juste après chaque
   * insertion d'écriture, `last_insert_rowid()` désigne celle qu'on vient de passer.
   */
  async seal(
    db: Db,
    handover: CashHandoverRow,
    receipts: { id: number; entry: CashEntry }[],
    gap: CashEntry | null,
    signature: { signatureMethod: CashHandoverRow['signatureMethod']; signatureData: string | null; signedAt: Date }
  ): Promise<boolean> {
    const statements: any[] = [
      db.update(cashHandoversTable).set({ countedCents: -1 })
        .where(and(eq(cashHandoversTable.id, handover.id), ne(cashHandoversTable.status, 'pending')))
    ];
    const insert = (e: CashEntry) => db.insert(ledgerEntriesTable).values({ ...e, accrualType: 'normal' });
    for (const r of receipts) {
      statements.push(
        insert(r.entry),
        db.update(cashReceiptsTable).set({ ledgerEntryId: sql`last_insert_rowid()` as any }).where(eq(cashReceiptsTable.id, r.id))
      );
    }
    if (gap) {
      statements.push(
        insert(gap),
        db.update(cashHandoversTable).set({ gapLedgerEntryId: sql`last_insert_rowid()` as any }).where(eq(cashHandoversTable.id, handover.id))
      );
    }
    statements.push(
      db.update(cashHandoversTable)
        .set({ ...signature, status: 'sealed', tokenHash: null, tokenExpiresAt: null })
        .where(eq(cashHandoversTable.id, handover.id))
    );
    try {
      await db.batch(statements as [any, ...any[]]);
      return true;
    } catch (err) {
      // Seule la contrainte de garde dit « déjà signée » ; toute autre violation est un vrai défaut.
      if (/cash_handovers_counted_check/.test(String((err as any)?.cause?.message ?? (err as Error)?.message ?? err))) return false;
      throw err;
    }
  }
}
