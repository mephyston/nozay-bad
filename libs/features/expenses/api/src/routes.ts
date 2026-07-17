import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, ne } from 'drizzle-orm';
import { expensesTable } from '@metacult/features-expenses-data-access';
import { sql } from 'drizzle-orm';
import { isSeasonClosed, normalizeCategory, AppError } from '@metacult/shared-db';
import { Type } from '@sinclair/typebox';
import { tbValidator } from '@hono/typebox-validator';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const expensesRouter = new Hono<{ Bindings: Bindings }>();

// isSeasonClosed and normalizeCategory are now imported from @metacult/shared-db

expensesRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);
  let conditions = [];
  if (season) conditions.push(eq(expensesTable.seasonId, season));
  if (status) conditions.push(eq(expensesTable.status, status as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const expenses = await db.select().from(expensesTable).where(whereClause).all();
  return c.json({ success: true, data: expenses });
});

const createExpenseSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
  category: Type.Union([Type.String(), Type.Integer()]),
  amount: Type.Integer({ minimum: 1 }),
  photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  emitterName: Type.String({ minLength: 1 }),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});

const updateExpenseSchema = Type.Object({
  seasonId: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  category: Type.Optional(Type.Union([Type.String(), Type.Integer()])),
  amount: Type.Optional(Type.Integer({ minimum: 1 })),
  photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  emitterName: Type.Optional(Type.String({ minLength: 1 })),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});

expensesRouter.post('/', tbValidator('json', createExpenseSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.path?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);

  if (await isSeasonClosed(db, body.seasonId)) {
    return c.json({ success: false, error: 'La saison est clôturée. Impossible de soumettre une note de frais.' }, 400);
  }

  const expense = await db.insert(expensesTable).values({
    seasonId: body.seasonId,
    description: body.description,
    category: normalizeCategory(body.category) || 1,
    amount: body.amount,
    photoUrl: body.photoUrl || null,
    status: 'pending',
    emitterName: body.emitterName,
    memberId: body.memberId || null,
    createdAt: new Date()
  }).returning().get();
  return c.json({ success: true, data: expense });
});

expensesRouter.post('/:id/approve', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);

  try {
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
    const updatedExpense = await db.update(expensesTable)
      .set({ status: 'approved', transactionId: tx.id })
      .where(eq(expensesTable.id, id))
      .returning().get();

    return c.json({ success: true, data: updatedExpense });
  } catch (err: any) {
    if (err instanceof AppError) {
      return c.json({ success: false, error: err.message }, err.status);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

expensesRouter.post('/:id/reject', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);

  try {
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

    const updatedExpense = await db.update(expensesTable)
      .set({ status: 'rejected' })
      .where(eq(expensesTable.id, id))
      .returning().get();

    return c.json({ success: true, data: updatedExpense });
  } catch (err: any) {
    if (err instanceof AppError) {
      return c.json({ success: false, error: err.message }, err.status);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

expensesRouter.post('/:id/cancel', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);

  try {
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

    return c.json({ success: true, data: updatedExpense });
  } catch (err: any) {
    if (err instanceof AppError) {
      return c.json({ success: false, error: err.message }, err.status);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

expensesRouter.put('/:id', tbValidator('json', updateExpenseSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.path?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);

  try {
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
      photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined
    }).where(eq(expensesTable.id, id)).returning().get();
    
    if (!updated) {
      throw new AppError('Dépense introuvable', 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      return c.json({ success: false, error: err.message }, err.status);
    }
    return c.json({ success: false, error: err.message }, 400);
  }
});
