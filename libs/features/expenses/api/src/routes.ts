import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, ne } from 'drizzle-orm';
import { expensesTable, transactionsTable, bankTransactionsTable, seasonsTable } from '@metacult/shared-db';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const expensesRouter = new Hono<{ Bindings: Bindings }>();

async function isSeasonClosed(db: any, seasonId: string): Promise<boolean> {
  const season = await db.select({ closed: seasonsTable.closed })
    .from(seasonsTable)
    .where(eq(seasonsTable.id, seasonId))
    .get();
  return season?.closed === 1 || season?.closed === true;
}

function normalizeCategory(categoryVal: any): number | null {
  if (categoryVal === undefined || categoryVal === null) return null;
  const num = Number(categoryVal);
  if (!isNaN(num)) return num;

  const legacyMap: Record<string, number> = {
    adhesions_inscriptions: 1,
    sponsoring: 2,
    subventions: 3,
    actions_jeunes: 4,
    tournois_senior: 5,
    evenements_buvettes: 6,
    cordage_vente: 7,
    volants: 8,
    salaires_charges: 9,
    materiel_club: 10,
    licences_federation: 11,
    championnats: 12,
    stages_formations: 13,
    fonctionnement_administratif: 14
  };
  return legacyMap[categoryVal] || null;
}

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

expensesRouter.post('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
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
  const db = drizzle(c.env.DB);

  let updatedExpense;
  try {
    const expense = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
    if (!expense) {
      throw new Error('Dépense introuvable');
    }
    if (await isSeasonClosed(db, expense.seasonId)) {
      throw new Error('La saison est clôturée. Impossible d\'approuver cette note de frais.');
    }
    if (expense.status !== 'pending') {
      throw new Error('Dépense déjà traitée');
    }

    // Créer la transaction de dépense
    const tx = await db.insert(transactionsTable).values({
      seasonId: expense.seasonId,
      type: 'depense',
      accountId: 'current',
      category: expense.category,
      amount: expense.amount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'virement',
      description: `Remboursement frais - ${expense.emitterName} - ${expense.description}`,
      memberId: expense.memberId,
      createdAt: new Date()
    }).returning().get();

    // Mettre à jour le statut et lier la transaction
    updatedExpense = await db.update(expensesTable)
      .set({ status: 'approved', transactionId: tx.id })
      .where(eq(expensesTable.id, id))
      .returning().get();
  } catch (err: any) {
    const status = err.message === 'Dépense introuvable' ? 404 : 400;
    return c.json({ success: false, error: err.message }, status);
  }

  return c.json({ success: true, data: updatedExpense });
});

expensesRouter.post('/:id/reject', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  let updatedExpense;
  try {
    const expense = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
    if (!expense) {
      throw new Error('Dépense introuvable');
    }
    if (await isSeasonClosed(db, expense.seasonId)) {
      throw new Error('La saison est clôturée. Impossible de rejeter cette note de frais.');
    }
    if (expense.status !== 'pending') {
      throw new Error('Dépense déjà traitée');
    }

    updatedExpense = await db.update(expensesTable)
      .set({ status: 'rejected' })
      .where(eq(expensesTable.id, id))
      .returning().get();
  } catch (err: any) {
    const status = err.message === 'Dépense introuvable' ? 404 : 400;
    return c.json({ success: false, error: err.message }, status);
  }

  return c.json({ success: true, data: updatedExpense });
});

expensesRouter.post('/:id/cancel', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  let updatedExpense;
  try {
    const expense = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
    if (!expense) {
      throw new Error('Dépense introuvable');
    }
    if (await isSeasonClosed(db, expense.seasonId)) {
      throw new Error('La saison est clôturée. Impossible d\'annuler la validation de cette note de frais.');
    }
    if (expense.status === 'pending') {
      throw new Error('Dépense déjà en attente');
    }

    const txId = expense.transactionId;

    // 1. Mettre à jour la note de frais d'abord pour couper la clé étrangère
    updatedExpense = await db.update(expensesTable)
      .set({ status: 'pending', transactionId: null })
      .where(eq(expensesTable.id, id))
      .returning().get();

    // 2. Si approuvée, supprimer la transaction associée
    if (expense.status === 'approved' && txId) {
      // 1. Récupérer la transaction
      const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).get();
      if (tx) {
        // Rapprochement bancaire : si la transaction est pointée, libérer l'écriture bancaire
        if (tx.bankTransactionId) {
          const bankTx = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, tx.bankTransactionId)).get();
          if (bankTx) {
            const remainingTxs = await db.select()
              .from(transactionsTable)
              .where(and(
                eq(transactionsTable.bankTransactionId, tx.bankTransactionId),
                ne(transactionsTable.id, tx.id)
              ))
              .all();
            const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
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

        // Supprimer la transaction du Grand Livre
        await db.delete(transactionsTable).where(eq(transactionsTable.id, tx.id)).run();
      }
    }
  } catch (err: any) {
    const status = err.message === 'Dépense introuvable' ? 404 : 400;
    return c.json({ success: false, error: err.message }, status);
  }

  return c.json({ success: true, data: updatedExpense });
});

expensesRouter.put('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  try {
    const existing = await db.select({ seasonId: expensesTable.seasonId })
      .from(expensesTable)
      .where(eq(expensesTable.id, id))
      .get();
    if (!existing) {
      return c.json({ success: false, error: 'Dépense introuvable' }, 404);
    }
    if (await isSeasonClosed(db, existing.seasonId)) {
      return c.json({ success: false, error: 'La saison d\'origine est clôturée. Impossible de modifier cette note de frais.' }, 400);
    }
    if (body.seasonId && await isSeasonClosed(db, body.seasonId)) {
      return c.json({ success: false, error: 'La saison cible est clôturée. Impossible d\'affecter cette note de frais.' }, 400);
    }

    const updated = await db.update(expensesTable).set({
      description: body.description,
      category: body.category !== undefined ? (normalizeCategory(body.category) || 1) : undefined,
      amount: body.amount,
      seasonId: body.seasonId,
      photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined
    }).where(eq(expensesTable.id, id)).returning().get();
    
    if (!updated) {
      return c.json({ success: false, error: 'Dépense introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
