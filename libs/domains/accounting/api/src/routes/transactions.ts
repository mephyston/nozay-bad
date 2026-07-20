import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, or, eq, ne, sql, inArray, desc, isNull } from 'drizzle-orm';
import {
  transactionsTable,
  bankTransactionsTable,
  checksTable,
  categoriesTable
} from '@metacult/features-accounting-data-access';
import {
  membersTable
} from '@metacult/features-members-data-access';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { normalizeCategory, AppError } from '@metacult/shared-db';
import type { Bindings } from '../routes';

export const transactionsRouter = new Hono<{ Bindings: Bindings }>();

// GET /
transactionsRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.query('season');
  const unreconciledChequesOnly = c.req.query('unreconciledCheques') === 'true';

  if (!seasonId && !unreconciledChequesOnly) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const db = drizzle(c.env.DB);
  const conditions = [];
  if (seasonId) {
    conditions.push(eq(transactionsTable.seasonId, seasonId));
  }

  const accountId = c.req.query('accountId');
  if (accountId) {
    conditions.push(or(eq(transactionsTable.accountId, accountId as any), eq(transactionsTable.destinationAccountId, accountId as any)) as any);
  }

  const type = c.req.query('type');
  if (type) {
    conditions.push(eq(transactionsTable.type, type as any));
  }

  const category = c.req.query('category');
  if (category) {
    conditions.push(eq(transactionsTable.category, parseInt(category)));
  }

  const classCode = c.req.query('classCode');
  if (classCode) {
    const matchingCats = await db.select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(or(eq(categoriesTable.receiptCode, classCode), eq(categoriesTable.expenseCode, classCode)))
      .all();
    const catIds = matchingCats.map(cat => cat.id);
    if (catIds.length > 0) {
      conditions.push(inArray(transactionsTable.category, catIds));
    } else {
      conditions.push(sql`1 = 0`);
    }
  }

  const memberId = c.req.query('memberId');
  if (memberId) {
    conditions.push(eq(transactionsTable.memberId, parseInt(memberId)));
  }

  if (unreconciledChequesOnly) {
    conditions.push(
      eq(transactionsTable.paymentMethod, 'cheque'),
      isNull(transactionsTable.bankTransactionId)
    );
  }

  const totalRes = await db.select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(and(...conditions))
    .get();
  const total = totalRes?.count || 0;

  const transactions = await db.select({
    id: transactionsTable.id,
    seasonId: transactionsTable.seasonId,
    type: transactionsTable.type,
    accountId: transactionsTable.accountId,
    destinationAccountId: transactionsTable.destinationAccountId,
    category: transactionsTable.category,
    amount: transactionsTable.amount,
    date: transactionsTable.date,
    paymentMethod: transactionsTable.paymentMethod,
    description: transactionsTable.description,
    reference: transactionsTable.reference,
    memberId: transactionsTable.memberId,
    bankTransactionId: transactionsTable.bankTransactionId,
    memberName: sql<string | null>`members.last_name || ' ' || members.first_name`,
    memberLicence: sql<string | null>`members.licence`
  })
    .from(transactionsTable)
    .leftJoin(membersTable, eq(transactionsTable.memberId, membersTable.id))
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
    .limit(limit)
    .offset(offset)
    .all();

  return c.json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
});

// POST /
transactionsRouter.post('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  // Valider les champs requis
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
  }

  if (await isSeasonClosed(db, body.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible de créer une transaction.', 400);
  }

  if (body.type === 'transfert') {
    if (!body.destinationAccountId || body.accountId === body.destinationAccountId) {
      return c.json({ success: false, error: 'Le compte destinataire doit être différent du compte source.' }, 400);
    }
  } else {
    if (!body.category) {
      return c.json({ success: false, error: 'La catégorie est obligatoire pour les recettes/dépenses.' }, 400);
    }
  }

  const [inserted] = await db.insert(transactionsTable).values({
    seasonId: body.seasonId,
    type: body.type,
    accountId: body.accountId,
    destinationAccountId: body.type === 'transfert' ? body.destinationAccountId : null,
    category: body.type !== 'transfert' ? normalizeCategory(body.category) : null,
    amount: Math.round(body.amount),
    date: body.date,
    paymentMethod: body.paymentMethod,
    description: body.description,
    reference: body.reference || null,
    createdAt: new Date()
  }).returning();

  return c.json({ success: true, data: inserted });
});

// PUT /:id
transactionsRouter.put('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
  }

  const existing = await db.select({ seasonId: transactionsTable.seasonId })
    .from(transactionsTable)
    .where(eq(transactionsTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Transaction introuvable' }, 404);
  }

  if (await isSeasonClosed(db, existing.seasonId)) {
    throw new AppError('La saison d\'origine est clôturée. Impossible de modifier cette transaction.', 400);
  }

  if (await isSeasonClosed(db, body.seasonId)) {
    throw new AppError('La saison cible est clôturée. Impossible d\'affecter cette transaction.', 400);
  }

  if (body.type === 'transfert') {
    if (!body.destinationAccountId || body.accountId === body.destinationAccountId) {
      return c.json({ success: false, error: 'Le compte destinataire doit être différent du compte source.' }, 400);
    }
  } else {
    if (!body.category) {
      return c.json({ success: false, error: 'La catégorie est obligatoire pour les recettes/dépenses.' }, 400);
    }
  }

  try {
    const updated = await db.update(transactionsTable).set({
      seasonId: body.seasonId,
      type: body.type,
      accountId: body.accountId,
      destinationAccountId: body.type === 'transfert' ? body.destinationAccountId : null,
      category: body.type !== 'transfert' ? normalizeCategory(body.category) : null,
      amount: Math.round(body.amount),
      date: body.date,
      paymentMethod: body.paymentMethod,
      description: body.description,
      reference: body.reference || null
    }).where(eq(transactionsTable.id, id)).returning().get();

    if (!updated) {
      return c.json({ success: false, error: 'Transaction introuvable' }, 404);
    }

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// DELETE /:id
transactionsRouter.delete('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid ID' }, 400);
  }
  const db = drizzle(c.env.DB);

  // 1. Récupérer la transaction pour vérifier les liens bankTransactionId et memberId
  const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  if (!tx) {
    return c.json({ success: false, error: 'Transaction non trouvée' }, 404);
  }

  if (await isSeasonClosed(db, tx.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible de supprimer cette transaction.', 400);
  }

  // 2. Si liée à un relevé bancaire, recalculer le pointage restant
  if (tx.bankTransactionId) {
    const bankTx = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, tx.bankTransactionId)).get();
    if (bankTx) {
      // Trouver les transactions restantes pointées sur cette écriture bancaire
      const remainingTxs = await db.select()
        .from(transactionsTable)
        .where(and(
          eq(transactionsTable.bankTransactionId, tx.bankTransactionId),
          ne(transactionsTable.id, id)
        ))
        .all();
      const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Si le total restant est inférieur au montant absolu du relevé bancaire, on le repasse en 'pending'
      if (totalRemaining < Math.abs(bankTx.amount)) {
        await db.update(bankTransactionsTable)
          .set({ 
            status: 'pending'
          })
          .where(eq(bankTransactionsTable.id, tx.bankTransactionId))
          .run();
      }
    }
  }

  // 3. Si liée à un adhérent pour une adhésion, déduire le montant reçu
  if (tx.memberId && (tx.category === 1 || String(tx.category) === '1')) {
    const member = await db.select().from(membersTable).where(eq(membersTable.id, tx.memberId)).get();
    if (member) {
      const newReceived = Math.max(0, member.amountReceived - Math.abs(tx.amount));
      const newRemaining = Math.max(0, member.amountDue - newReceived);
      const isPaid = newRemaining === 0;

      await db.update(membersTable)
        .set({
          amountReceived: newReceived,
          amountRemaining: newRemaining,
          paid: isPaid
        })
        .where(eq(membersTable.id, tx.memberId))
        .run();
    }
  }

  // 3.5. Si liée à une note de frais, la repasser en 'pending' via SQL brut
  await db.run(sql`
    UPDATE expenses SET status = 'pending', transaction_id = NULL WHERE transaction_id = ${id}
  `);

  // 4. Supprimer la transaction du Grand Livre
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();

  return c.json({ success: true });
});
