import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, ne, desc, gte, lte } from 'drizzle-orm';
import {
  seasonBalancesTable,
  transactionsTable,
  categoriesTable,
  seasonCategoryBudgetsTable,
  normalizeCategory
} from '@metacult/features-accounting-data-access';
import {
  seasonsTable,
  isSeasonClosed
} from '@metacult/features-members-data-access';
import { AppError } from '@metacult/shared-db';
import type { Bindings } from '../routes';

export const seasonsRouter = new Hono<{ Bindings: Bindings }>();

seasonsRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const db = drizzle(c.env.DB);
  const seasons = await db.select()
    .from(seasonsTable)
    .orderBy(desc(seasonsTable.id))
    .all();

  return c.json({
    success: true,
    data: seasons
  });
});

seasonsRouter.post('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    if (body.active) {
      await db.update(seasonsTable).set({ active: false }).run();
    }
    const newSeason = await db.insert(seasonsTable).values({
      id: body.id,
      name: body.name,
      active: body.active || false,
      createdAt: new Date()
    }).returning().get();
    return c.json({ success: true, data: newSeason });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.put('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    if (body.active) {
      await db.update(seasonsTable).set({ active: false }).where(ne(seasonsTable.id, id)).run();
    }
    const updated = await db.update(seasonsTable).set({
      name: body.name !== undefined ? body.name : undefined,
      active: body.active !== undefined ? body.active : undefined,
      closed: body.closed !== undefined ? body.closed : undefined
    }).where(eq(seasonsTable.id, id)).returning().get();

    if (!updated) {
      return c.json({ success: false, error: 'Saison introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.post('/:id/close', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const updated = await db.update(seasonsTable)
      .set({ closed: true })
      .where(eq(seasonsTable.id, id))
      .returning()
      .get();
    if (!updated) {
      return c.json({ success: false, error: 'Saison introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.get('/:seasonId/budget', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  try {
    const list = await db.select().from(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, seasonId)).all();
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

seasonsRouter.post('/:seasonId/budget', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const body = await c.req.json() as { categoryId: number; type: 'recette' | 'depense'; amount: number }[];
  const db = drizzle(c.env.DB);

  if (await isSeasonClosed(db, seasonId)) {
    throw new AppError('La saison est clôturée. Impossible de modifier son prévisionnel.', 400);
  }

  try {
    await db.delete(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, seasonId)).run();

    const inserted = [];
    for (const item of body) {
      if (item.categoryId) {
        const entry = await db.insert(seasonCategoryBudgetsTable).values({
          seasonId,
          categoryId: item.categoryId,
          type: item.type,
          amount: Math.round(item.amount),
          createdAt: new Date()
        }).returning().get();
        inserted.push(entry);
      }
    }
    return c.json({ success: true, data: inserted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.get('/:seasonId/balance', async (c) => {
  if (!c.env || !c.env.DB) {
    throw new AppError('Database binding DB is missing', 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);

  const [yy, zz] = seasonId.split('-');
  if (!yy || !zz || yy.length !== 2 || zz.length !== 2) {
    throw new AppError('Format de saison invalide. Format attendu : YY-ZZ (ex: 25-26)', 400);
  }

  const startYear = 2000 + parseInt(yy);
  const endYear = 2000 + parseInt(zz);
  const startDateStr = `${startYear}-09-01`;
  const endDateStr = `${endYear}-08-31`;

  const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();

  const cashFlowTxs = await db.select()
    .from(transactionsTable)
    .where(and(
      gte(transactionsTable.date, startDateStr),
      lte(transactionsTable.date, endDateStr)
    ))
    .all();

  const accounts = ['current', 'savings', 'cash'] as const;
  let totalBalance = 0;

  for (const acc of accounts) {
    const initBal = balances.find(b => b.accountId === acc)?.initialBalance || 0;
    let finalBal = initBal;
    for (const tx of cashFlowTxs) {
      if (tx.type === 'recette' && tx.accountId === acc) {
        finalBal += tx.amount;
      } else if (tx.type === 'depense' && tx.accountId === acc) {
        finalBal -= tx.amount;
      } else if (tx.type === 'transfert') {
        if (tx.accountId === acc) finalBal -= tx.amount;
        if (tx.destinationAccountId === acc) finalBal += tx.amount;
      }
    }
    totalBalance += finalBal;
  }

  return c.json({
    success: true,
    data: {
      balance: totalBalance
    }
  });
});

seasonsRouter.get('/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  return c.json({ success: true, data: balances });
});

seasonsRouter.post('/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const body = await c.req.json() as { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[];
  const db = drizzle(c.env.DB);

  if (await isSeasonClosed(db, seasonId)) {
    throw new AppError('La saison est clôturée. Impossible de modifier ses soldes initiaux.', 400);
  }

  for (const item of body) {
    await db.insert(seasonBalancesTable)
      .values({
        seasonId,
        accountId: item.accountId,
        initialBalance: item.initialBalance,
        createdAt: new Date()
      })
      .onConflictDoUpdate({
        target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
        set: { initialBalance: item.initialBalance }
      })
      .run();
  }

  return c.json({ success: true });
});

seasonsRouter.get('/:seasonId/reports', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);

  // Parse years from seasonId (format YY-ZZ)
  const [yy, zz] = seasonId.split('-');
  const startYear = 2000 + parseInt(yy);
  const endYear = 2000 + parseInt(zz);
  const startDateStr = `${startYear}-09-01`;
  const endDateStr = `${endYear}-08-31`;

  // Récupérer les soldes initiaux
  const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  
  // Récupérer toutes les transactions de la saison (par seasonId pour le budget)
  const allTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.seasonId, seasonId)).all();

  // Récupérer toutes les transactions de la période pour les flux de trésorerie (par date)
  const cashFlowTxs = await db.select()
    .from(transactionsTable)
    .where(and(
      gte(transactionsTable.date, startDateStr),
      lte(transactionsTable.date, endDateStr)
    ))
    .all();

  // 1. Calcul du compte de résultat (ventilé par catégorie)
  const categoryTotals: Record<string, { type: 'recette' | 'depense', total: number }> = {};
  let totalRecettes = 0;
  let totalDepenses = 0;

  const transitCat = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Virements Internes (Transit)')).get();
  const transitCatId = transitCat ? transitCat.id : null;

  for (const tx of allTxs) {
    if (tx.type === 'transfert') continue;
    
    const cat = normalizeCategory(tx.category)?.toString() || 'divers';
    const key = `${cat}_${tx.type}`;
    if (!categoryTotals[key]) {
      categoryTotals[key] = { type: tx.type, total: 0 };
    }
    categoryTotals[key].total += tx.amount;
    
    if (normalizeCategory(tx.category) !== transitCatId) {
      if (tx.type === 'recette') {
        totalRecettes += tx.amount;
      } else {
        totalDepenses += tx.amount;
      }
    }
  }

  // 2. Calcul du bilan de trésorerie (init vs final en fonction de la date de transaction)
  const accounts = ['current', 'savings', 'cash'] as const;
  const reportBalances = accounts.map(acc => {
    const initBal = balances.find(b => b.accountId === acc)?.initialBalance || 0;
    
    // Calculer le solde final pour ce compte en utilisant les flux réels
    let finalBal = initBal;
    for (const tx of cashFlowTxs) {
      if (tx.type === 'recette' && tx.accountId === acc) {
        finalBal += tx.amount;
      } else if (tx.type === 'depense' && tx.accountId === acc) {
        finalBal -= tx.amount;
      } else if (tx.type === 'transfert') {
        if (tx.accountId === acc) finalBal -= tx.amount; // Sortie du compte source
        if (tx.destinationAccountId === acc) finalBal += tx.amount; // Entrée sur compte cible
      }
    }

    return {
      accountId: acc,
      initialBalance: initBal,
      finalBalance: finalBal
    };
  });

  return c.json({
    success: true,
    data: {
      compteResultat: {
        totalRecettes,
        totalDepenses,
        netResult: totalRecettes - totalDepenses,
        categories: categoryTotals
      },
      bilanTrésorerie: reportBalances
    }
  });
});
