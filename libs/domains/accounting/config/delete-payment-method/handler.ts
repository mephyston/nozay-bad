import { AppError, type Db } from '@nba/db';
import { eq, sql } from 'drizzle-orm';
import { ledgerEntriesTable, paymentMethodsTable } from '../../shared/schema';

/** Ce qui, ailleurs, renvoie à un moyen de paiement — la table et sa colonne, par domaine. */
const REFERENCES: { table: string; column: string; label: string }[] = [
  { table: 'ledger_entries', column: 'payment_method_id', label: 'écriture(s) du grand livre' },
  { table: 'orders', column: 'payment_method_id', label: 'commande(s) de la boutique' }
];

/**
 * Supprime un moyen de paiement, à condition que rien n'y renvoie.
 *
 * Une écriture ou une commande qui le cite le garde pour toujours : supprimer le moyen
 * laisserait une référence orpheline, et « Chèque LABAZ » disparaîtrait de l'historique.
 * Le club le rend inactif à la place — c'est ce que le message dit.
 */
export async function deletePaymentMethod(db: Db, id: number): Promise<void> {
  const current = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, id)).get();
  if (!current) throw new AppError('Moyen de paiement introuvable.', 404);
  if (current.kind === 'internal') throw new AppError('Le virement interne ne se supprime pas.', 400);

  const uses: string[] = [];
  for (const ref of REFERENCES) {
    const row = await db.get<{ n: number }>(
      sql`SELECT COUNT(*) AS n FROM ${sql.identifier(ref.table)} WHERE ${sql.identifier(ref.column)} = ${id}`
    );
    if ((row?.n ?? 0) > 0) uses.push(`${row!.n} ${ref.label}`);
  }
  if (uses.length > 0) {
    throw new AppError(`« ${current.label} » est référencé par ${uses.join(' et ')} : rendez-le inactif plutôt que de le supprimer.`, 409);
  }

  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id)).run();
}
