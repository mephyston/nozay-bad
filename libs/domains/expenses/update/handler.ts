import { eq, sql } from 'drizzle-orm';
import { expensesTable } from '@metacult/features-expenses-data-access';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { normalizeCategory } from '@metacult/features-accounting-data-access';
import { AppError } from '@metacult/shared-db';

export async function approveExpense(db: any, id: number) {
  const expense = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  if (!expense) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible d\'approuver cette note de frais.', 400);
  }
  if (expense.status !== 'pending') {
    throw new AppError('Dépense déjà traitée', 400);
  }

  // Créer la transaction de dépense via SQL brut
  const tx = await db.get(sql`
    INSERT INTO transactions (season_id, type, account_id, category, amount, date, payment_method, description, member_id, created_at)
    VALUES (${expense.seasonId}, 'depense', 'current', ${expense.category}, ${expense.amount}, ${new Date().toISOString().split('T')[0]}, 'virement', ${`Remboursement frais - ${expense.emitterName} - ${expense.description}`}, ${expense.memberId}, ${new Date().getTime()})
    RETURNING id
  `) as { id: number };

  // Mettre à jour le statut et lier la transaction
  return db.update(expensesTable)
    .set({ status: 'approved', transactionId: tx.id })
    .where(eq(expensesTable.id, id))
    .returning().get();
}

export async function rejectExpense(db: any, id: number) {
  const expense = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  if (!expense) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible de rejeter cette note de frais.', 400);
  }
  if (expense.status !== 'pending') {
    throw new AppError('Dépense déjà traitée', 400);
  }

  return db.update(expensesTable)
    .set({ status: 'rejected' })
    .where(eq(expensesTable.id, id))
    .returning().get();
}

export async function cancelExpenseApproval(db: any, id: number) {
  const expense = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  if (!expense) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible d\'annuler la validation de cette note de frais.', 400);
  }
  if (expense.status === 'pending') {
    throw new AppError('Dépense déjà en attente', 400);
  }

  const txId = expense.transactionId;

  // 1. Mettre à jour la note de frais d'abord pour couper la clé étrangère
  const updatedExpense = await db.update(expensesTable)
    .set({ status: 'pending', transactionId: null })
    .where(eq(expensesTable.id, id))
    .returning().get();

  // 2. Si approuvée, supprimer la transaction associée
  if (expense.status === 'approved' && txId) {
    // 1. Récupérer la transaction via SQL brut
    const tx = await db.get(sql`
      SELECT id, bank_transaction_id as bankTransactionId, amount FROM transactions WHERE id = ${txId}
    `) as { id: number; bankTransactionId: number | null; amount: number } | undefined;

    if (tx) {
      // Rapprochement bancaire : si la transaction est pointée, libérer l'écriture bancaire
      if (tx.bankTransactionId) {
        const bankTx = await db.get(sql`
          SELECT id, amount FROM bank_transactions WHERE id = ${tx.bankTransactionId}
        `) as { id: number; amount: number } | undefined;

        if (bankTx) {
          const remainingTxs = await db.all(sql`
            SELECT id, amount FROM transactions 
            WHERE bank_transaction_id = ${tx.bankTransactionId} AND id != ${tx.id}
          `) as { id: number; amount: number }[];
          const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          if (totalRemaining < Math.abs(bankTx.amount)) {
            await db.run(sql`
              UPDATE bank_transactions SET status = 'pending' WHERE id = ${tx.bankTransactionId}
            `);
          }
        }
      }

      // Supprimer la transaction du Grand Livre
      await db.run(sql`DELETE FROM transactions WHERE id = ${tx.id}`);
    }
  }

  return updatedExpense;
}

export async function updateExpense(
  db: any,
  id: number,
  body: {
    seasonId?: string;
    description?: string;
    category?: string | number;
    amount?: number;
    photoUrl?: string | null;
    emitterName?: string;
    memberId?: number | null;
  }
) {
  const existing = await db.select({ seasonId: expensesTable.seasonId })
    .from(expensesTable)
    .where(eq(expensesTable.id, id))
    .get();
  if (!existing) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, existing.seasonId)) {
    throw new AppError('La saison d\'origine est clôturée. Impossible de modifier cette note de frais.', 400);
  }
  if (body.seasonId && await isSeasonClosed(db, body.seasonId)) {
    throw new AppError('La saison cible est clôturée. Impossible d\'affecter cette note de frais.', 400);
  }

  const updated = await db.update(expensesTable).set({
    description: body.description,
    category: body.category !== undefined ? (normalizeCategory(body.category) || 1) : undefined,
    amount: body.amount,
    seasonId: body.seasonId,
    photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined,
    emitterName: body.emitterName,
    memberId: body.memberId !== undefined ? body.memberId : undefined
  }).where(eq(expensesTable.id, id)).returning().get();
  
  if (!updated) {
    throw new AppError('Dépense introuvable', 404);
  }
  return updated;
}
