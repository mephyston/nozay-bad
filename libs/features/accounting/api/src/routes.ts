import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, or, eq, ne, like, sql, inArray, desc, gte, lte, isNull } from 'drizzle-orm';
import {
  seasonBalancesTable,
  transactionsTable,
  bankTransactionsTable,
  checksTable,
  checkDepositsTable,
  categoriesTable,
  accountClassesTable,
  seasonCategoryBudgetsTable,
  invoicesTable,
  invoiceItemsTable
} from '@metacult/features-accounting-data-access';
import {
  seasonsTable,
  membersTable
} from '@metacult/features-members-data-access';
import { isSeasonClosed, normalizeCategory, AppError } from '@metacult/shared-db';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const accountingRouter = new Hono<{ Bindings: Bindings }>();

// Helper functions
function cleanName(name: string | null): string {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim()
    .toLowerCase();
}

// isSeasonClosed and normalizeCategory are imported from @metacult/shared-db

export function parseOFX(ofxContent: string): { transactions: { fitid: string; amount: number; date: string; name: string; memo: string | null; accountId: 'current' | 'savings' }[] } {
  // 1. Détecter le compte bancaire depuis <ACCTID>
  const acctIdMatch = ofxContent.match(/<ACCTID>([^\r\n<]+)/);
  const acctId = acctIdMatch ? acctIdMatch[1].trim() : '';
  const accountId: 'current' | 'savings' = acctId === '00070007847' ? 'savings' : 'current';

  const transactions: any[] = [];
  // 2. Extraire chaque transaction de type <STMTTRN> ... </STMTTRN> (ou jusqu'au prochain bloc ou fin de balise)
  const blocks = ofxContent.split('<STMTTRN>');
  // Le premier bloc contient les en-têtes et le début du fichier, on l'ignore
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('</STMTTRN>')[0];
    
    const fitidMatch = block.match(/<FITID>([^\r\n<]+)/);
    const trnamtMatch = block.match(/<TRNAMT>([^\r\n<]+)/);
    const dtpostedMatch = block.match(/<DTPOSTED>([^\r\n<]+)/);
    const nameMatch = block.match(/<NAME>([^\r\n<]+)/);
    const memoMatch = block.match(/<MEMO>([^\r\n<]+)/);

    if (!fitidMatch || !trnamtMatch || !dtpostedMatch || !nameMatch) continue;

    const rawAmount = parseFloat(trnamtMatch[1].trim());
    const amountCents = Math.round(rawAmount * 100);

    const rawDate = dtpostedMatch[1].trim(); // Format YYYYMMDD
    const dateFormatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;

    transactions.push({
      fitid: fitidMatch[1].trim(),
      accountId,
      amount: amountCents,
      date: dateFormatted,
      name: nameMatch[1].trim(),
      memo: memoMatch ? memoMatch[1].trim() : null
    });
  }

  return { transactions };
}

async function reconcileBankTxInternal(db: any, id: number, body: any): Promise<{ success: boolean, error?: string, status?: number }> {
  const bankTx = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, id)).get();
  if (!bankTx) {
    return { success: false, error: 'Écriture bancaire non trouvée.', status: 404 };
  }

  if (await isSeasonClosed(db, bankTx.seasonId)) {
    return { success: false, error: 'La saison de l\'écriture bancaire est clôturée.', status: 400 };
  }

  const memberId = body.memberId || body.transaction?.memberId;
  const invoiceId = body.invoiceId;
  const invoiceIds = body.invoiceIds;

  if (invoiceId) {
    const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).get();
    if (!invoice) {
      return { success: false, error: 'Facture introuvable', status: 404 };
    }
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return { success: false, error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
    }
    if (await isSeasonClosed(db, invoice.seasonId)) {
      return { success: false, error: 'La saison de la facture est clôturée.', status: 400 };
    }
  }

  if (invoiceIds && Array.isArray(invoiceIds)) {
    for (const invId of invoiceIds) {
      const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invId)).get();
      if (!invoice) {
        return { success: false, error: 'Facture introuvable', status: 404 };
      }
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return { success: false, error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
      }
      if (await isSeasonClosed(db, invoice.seasonId)) {
        return { success: false, error: 'La saison de la facture est clôturée.', status: 400 };
      }
    }
  }

  let lastTxId = null;

  if (body.action === 'match') {
    const existingTx = await db.select({ seasonId: transactionsTable.seasonId })
      .from(transactionsTable)
      .where(eq(transactionsTable.id, body.transactionId))
      .get();
    if (!existingTx) {
      return { success: false, error: 'Transaction cible introuvable.', status: 404 };
    }
    if (await isSeasonClosed(db, existingTx.seasonId)) {
      return { success: false, error: 'La saison de la transaction est clôturée. Rapprochement impossible.', status: 400 };
    }

    await db.update(transactionsTable)
      .set({ 
        bankTransactionId: id,
        memberId: memberId || undefined
      })
      .where(eq(transactionsTable.id, body.transactionId))
      .run();
    lastTxId = body.transactionId;
  } else if (body.action === 'create') {
    if (body.transactions && Array.isArray(body.transactions)) {
      for (const txItem of body.transactions) {
        if (await isSeasonClosed(db, txItem.seasonId)) {
          return { success: false, error: 'La saison cible est clôturée. Rapprochement impossible.', status: 400 };
        }
        await db.insert(transactionsTable).values({
          seasonId: txItem.seasonId,
          type: txItem.type,
          accountId: txItem.accountId,
          destinationAccountId: txItem.destinationAccountId || null,
          category: normalizeCategory(txItem.category),
          amount: Math.round(txItem.amount),
          date: txItem.date,
          paymentMethod: txItem.paymentMethod,
          description: txItem.description,
          reference: txItem.reference || null,
          memberId: memberId || null,
          invoiceId: invoiceId || null,
          bankTransactionId: id,
          createdAt: new Date()
        }).run();
      }
    } else {
      const tx = body.transaction;
      if (!tx) {
        return { success: false, error: 'Détails de la transaction manquants.', status: 400 };
      }
      if (await isSeasonClosed(db, tx.seasonId)) {
        return { success: false, error: 'La saison cible est clôturée. Rapprochement impossible.', status: 400 };
      }

      const [newTx] = await db.insert(transactionsTable).values({
        seasonId: tx.seasonId,
        type: tx.type,
        accountId: tx.accountId,
        destinationAccountId: tx.destinationAccountId || null,
        category: normalizeCategory(tx.category),
        amount: Math.round(tx.amount),
        date: tx.date,
        paymentMethod: tx.paymentMethod,
        description: tx.description,
        reference: tx.reference || null,
        memberId: memberId || null,
        invoiceId: (invoiceIds && invoiceIds.length > 0) ? invoiceIds[0] : (invoiceId || null),
        bankTransactionId: id,
        createdAt: new Date()
      }).returning();

      lastTxId = newTx.id;
    }

    if (invoiceId) {
      await db.update(invoicesTable)
        .set({ status: 'paid', bankTransactionId: id })
        .where(eq(invoicesTable.id, invoiceId))
        .run();
    }

    if (invoiceIds && Array.isArray(invoiceIds)) {
      for (const invId of invoiceIds) {
        await db.update(invoicesTable)
          .set({ status: 'paid', bankTransactionId: id })
          .where(eq(invoicesTable.id, invId))
          .run();
      }
    }
  } else {
    return { success: false, error: 'Action invalide.', status: 400 };
  }

  const linkedTxs = await db.select()
    .from(transactionsTable)
    .where(eq(transactionsTable.bankTransactionId, id))
    .all();
  const totalLinked = linkedTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  if (totalLinked >= Math.abs(bankTx.amount)) {
    await db.update(bankTransactionsTable)
      .set({ status: 'reconciled' })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }

  if (memberId) {
    const isMembershipCategory = (cat: any) => {
      const norm = normalizeCategory(cat);
      return norm === 1 || cat === 'adhesions_inscriptions' || String(cat) === '1';
    };

    let amountToApply = 0;
    let hasMembershipTx = false;

    if (body.action === 'create') {
      if (body.transactions && Array.isArray(body.transactions)) {
        const membershipTxs = body.transactions.filter((t: any) => isMembershipCategory(t.category));
        if (membershipTxs.length > 0) {
          hasMembershipTx = true;
          amountToApply = membershipTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        }
      } else {
        const categoryStr = body.transaction?.category;
        if (isMembershipCategory(categoryStr)) {
          hasMembershipTx = true;
          amountToApply = Math.abs(body.transaction?.amount ?? bankTx.amount);
        }
      }
    } else if (body.action === 'match') {
      const matchedTx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, body.transactionId)).get();
      const categoryStr = matchedTx ? matchedTx.category : null;
      if (isMembershipCategory(categoryStr)) {
        hasMembershipTx = true;
        amountToApply = Math.abs(bankTx.amount);
      }
    }

    if (hasMembershipTx) {
      const member = await db.select().from(membersTable).where(eq(membersTable.id, memberId)).get();
      if (member) {
        const newReceived = member.amountReceived + amountToApply;
        const newRemaining = Math.max(0, member.amountDue - newReceived);
        const isPaid = newRemaining === 0;

        await db.update(membersTable)
          .set({
            amountReceived: newReceived,
            amountRemaining: newRemaining,
            paid: isPaid
          })
          .where(eq(membersTable.id, memberId))
          .run();
      }
    }
  }

  return { success: true };
}

// 1. SEASONS ROUTES
accountingRouter.get('/seasons', async (c) => {
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

accountingRouter.post('/seasons', async (c) => {
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

accountingRouter.put('/seasons/:id', async (c) => {
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

accountingRouter.post('/seasons/:id/close', async (c) => {
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

accountingRouter.get('/seasons/:seasonId/budget', async (c) => {
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

accountingRouter.post('/seasons/:seasonId/budget', async (c) => {
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

accountingRouter.get('/seasons/:seasonId/balance', async (c) => {
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

accountingRouter.get('/seasons/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  return c.json({ success: true, data: balances });
});

accountingRouter.post('/seasons/:seasonId/balances', async (c) => {
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

accountingRouter.get('/seasons/:seasonId/reports', async (c) => {
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

// 2. TRANSACTIONS ROUTES
accountingRouter.get('/transactions', async (c) => {
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

accountingRouter.post('/transactions', async (c) => {
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

accountingRouter.put('/transactions/:id', async (c) => {
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

accountingRouter.delete('/transactions/:id', async (c) => {
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

// 3. BANK TRANSACTIONS ROUTES
accountingRouter.get('/bank-transactions', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status');
  const accountId = c.req.query('accountId');

  const db = drizzle(c.env.DB);
  const conditions = [
    eq(bankTransactionsTable.seasonId, season)
  ];

  if (status) {
    conditions.push(eq(bankTransactionsTable.status, status as any));
  }

  if (accountId) {
    conditions.push(eq(bankTransactionsTable.accountId, accountId as any));
  }

  const data = await db.select()
    .from(bankTransactionsTable)
    .where(and(...conditions))
    .orderBy(desc(bankTransactionsTable.date), desc(bankTransactionsTable.id))
    .all();

  return c.json({ success: true, data });
});

accountingRouter.post('/bank-transactions/import', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.parseBody();
  const file = body.file;
  const seasonId = body.seasonId as string;
  const forcedAccountId = body.accountId as string;

  if (!file || !seasonId) {
    return c.json({ success: false, error: 'Fichier et saison obligatoires.' }, 400);
  }

  let content: string;
  if (typeof file === 'string') {
    content = file;
  } else if (typeof file === 'object' && file !== null) {
    if ('text' in file && typeof (file as any).text === 'function') {
      content = await (file as any).text();
    } else if ('arrayBuffer' in file && typeof (file as any).arrayBuffer === 'function') {
      const arrayBuffer = await (file as any).arrayBuffer();
      const utf8Decoder = new TextDecoder('utf-8');
      content = utf8Decoder.decode(arrayBuffer);
    } else {
      return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
    }
  } else {
    return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
  }

  const { transactions } = parseOFX(content);
  if (transactions.length === 0) {
    return c.json({ success: true, count: 0 });
  }

  const db = drizzle(c.env.DB);
  let insertedCount = 0;

  try {
    await db.transaction(async (txDb) => {
      for (const tx of transactions) {
        const targetAccount = (forcedAccountId && forcedAccountId !== 'auto') 
          ? (forcedAccountId as 'current' | 'savings') 
          : tx.accountId;

        const res = await txDb.insert(bankTransactionsTable)
          .values({
            fitid: tx.fitid,
            seasonId,
            accountId: targetAccount,
            amount: tx.amount,
            date: tx.date,
            name: tx.name,
            memo: tx.memo,
            status: 'pending',
            createdAt: new Date()
          })
          .onConflictDoNothing()
          .run();
        
        const changes = res?.meta?.changes ?? 0;
        if (changes > 0) {
          insertedCount++;
        }
      }
    });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      // Fallback: run sequentially without transaction (for D1/Wrangler local limitations)
      insertedCount = 0;
      for (const tx of transactions) {
        const targetAccount = (forcedAccountId && forcedAccountId !== 'auto') 
          ? (forcedAccountId as 'current' | 'savings') 
          : tx.accountId;

        const res = await db.insert(bankTransactionsTable)
          .values({
            fitid: tx.fitid,
            seasonId,
            accountId: targetAccount,
            amount: tx.amount,
            date: tx.date,
            name: tx.name,
            memo: tx.memo,
            status: 'pending',
            createdAt: new Date()
          })
          .onConflictDoNothing()
          .run();
        
        const changes = res?.meta?.changes ?? 0;
        if (changes > 0) {
          insertedCount++;
        }
      }
    } else {
      return c.json({ success: false, error: "Erreur lors de l'insertion en base : " + err.message }, 500);
    }
  }

  return c.json({ success: true, count: insertedCount });
});

accountingRouter.post('/bank-transactions/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const singleId = c.req.query('id');

  const db = drizzle(c.env.DB);
  
  const conditions = [
    eq(bankTransactionsTable.seasonId, season),
    eq(bankTransactionsTable.status, 'pending')
  ];
  if (singleId) {
    conditions.push(eq(bankTransactionsTable.id, parseInt(singleId)));
  }

  // 1. Récupérer toutes les transactions bancaires pending de la saison
  const pendingTxs = await db.select()
    .from(bankTransactionsTable)
    .where(and(...conditions))
    .all();

  // 2. Récupérer tous les adhérents de la saison pour la présélection
  const members = await db.select()
    .from(membersTable)
    .where(eq(membersTable.season, season))
    .all();

  // 3. Récupérer des rapprochements passés validés pour entraîner l'IA (Few-shot learning)
  const pastReconciled = await db.select({
    fitid: bankTransactionsTable.fitid,
    name: bankTransactionsTable.name,
    memo: bankTransactionsTable.memo,
    amount: bankTransactionsTable.amount,
    category: transactionsTable.category,
    memberLastName: membersTable.lastName,
    memberFirstName: membersTable.firstName
  })
  .from(bankTransactionsTable)
  .innerJoin(transactionsTable, eq(transactionsTable.bankTransactionId, bankTransactionsTable.id))
  .leftJoin(membersTable, eq(membersTable.id, transactionsTable.memberId))
  .where(eq(bankTransactionsTable.status, 'reconciled'))
  .orderBy(desc(bankTransactionsTable.id))
  .limit(20)
  .all();

  let examplesPrompt = "";
  if (pastReconciled.length > 0) {
    examplesPrompt = "\nVoici des exemples récents de rapprochements réels déjà validés par le trésorier (sers-toi en comme référence) :\n";
    for (const ex of pastReconciled) {
      const memberName = ex.memberLastName ? `${ex.memberLastName} ${ex.memberFirstName}` : "Aucun";
      const catLabel = ex.category ? String(ex.category) : "Inconnue";
      examplesPrompt += `- Libellé bancaire : "${ex.name}" | Mémo : "${ex.memo || ''}" | Montant : ${(ex.amount / 100).toFixed(2)} EUR | Catégorie attribuée : ${catLabel} | Adhérent lié : ${memberName}\n`;
    }
    examplesPrompt += "\nSers-toi de ces exemples historiques pour orienter ton choix de catégorie ou de membre si l'opération à rapprocher est similaire.\n";
  }

  // 4. Récupérer tous les produits actifs pour le matching par montant via SQL brut
  const activeProducts = await db.all(sql`
    SELECT id, name, category, price, stock, active, created_at as createdAt 
    FROM products WHERE active = 1
  `) as { id: number; name: string; category: string; price: number; stock: number; active: boolean; createdAt: number }[];

  function getProductAccountingCategory(prodCat: string): number {
    if (prodCat === 'shuttlecock') return 8; // Volants
    if (prodCat === 'string') return 7; // Cordages
    return 10; // Autre/Matériel
  }

  const productsPrompt = activeProducts.map(p => {
    const accCat = getProductAccountingCategory(p.category);
    return `- Produit : "${p.name}" | Prix : ${(p.price / 100).toFixed(2)} EUR | Catégorie Comptable associée : ${accCat}`;
  }).join('\n');

  let analyzedCount = 0;

  // Category integer ID mapping
  const CAT_ADHESIONS = 1;
  const CAT_SPONSORING = 2;
  const CAT_SUBVENTIONS = 3;
  const CAT_ACTIONS_JEUNES = 4;
  const CAT_TOURNOIS_SENIOR = 5;
  const CAT_EVENEMENTS_BUVETTES = 6;
  const CAT_CORDAGE_VENTE = 7;
  const CAT_VOLANTS = 8;
  const CAT_SALAIRES_CHARGES = 9;
  const CAT_MATERIEL_CLUB = 10;
  const CAT_LICENCES_FEDERATION = 11;
  const CAT_CHAMPIONNATS = 12;
  const CAT_STAGES_FORMATIONS = 13;
  const CAT_FONCTIONNEMENT_ADMIN = 14;
  const CAT_VIREMENTS_INTERNES = 15;

  for (const tx of pendingTxs) {
    // Déterminer la catégorie par défaut par dictionnaire simple
    let suggestedCategory = tx.amount < 0 ? CAT_FONCTIONNEMENT_ADMIN : CAT_ADHESIONS;
    
    // Tenter de faire correspondre par tarif produit d'abord (fallback de montant exact ou multiple de 15€ ou 31.50€)
    const absAmount = Math.abs(tx.amount);
    const matchingProduct = activeProducts.find(p => {
      if (p.price === absAmount) return true;
      if (p.category === 'shuttlecock' && absAmount % p.price === 0 && absAmount <= p.price * 4) return true;
      if (p.category === 'string' && absAmount % p.price === 0 && absAmount <= p.price * 4) return true;
      return false;
    });
    if (matchingProduct) {
      suggestedCategory = getProductAccountingCategory(matchingProduct.category);
    }

    const textToLower = `${tx.name} ${tx.memo || ''}`.toLowerCase();
    
    if (
      /\b\d{20,}\b/.test(textToLower) || 
      textToLower.includes('virement interne') || 
      textToLower.includes('virmt interne') ||
      textToLower.includes('de: nozay badminton') ||
      textToLower.includes('de: nozay bad') ||
      textToLower.includes('de: nba') ||
      textToLower.includes('pour: nozay badminton') ||
      textToLower.includes('pour: nozay bad') ||
      textToLower.includes('pour: nba') ||
      (textToLower.includes('nozay badminton') && textToLower.includes('recharge'))
    ) {
      suggestedCategory = CAT_VIREMENTS_INTERNES;
    } else if (
      textToLower.includes('adhesion') || 
      textToLower.includes('cotisation') || 
      (textToLower.includes('inscription') && !textToLower.includes('tournoi') && !textToLower.includes('ebad')) ||
      (textToLower.includes('licence') && tx.amount > 0) ||
      (textToLower.includes('licences') && tx.amount > 0)
    ) {
      suggestedCategory = CAT_ADHESIONS;
    } else if (textToLower.includes('ionos')) {
      suggestedCategory = CAT_FONCTIONNEMENT_ADMIN;
    } else if (textToLower.includes('urssaf') || textToLower.includes('afdas')) {
      suggestedCategory = CAT_SALAIRES_CHARGES;
    } else if (
      textToLower.includes('deplacement jeune') || 
      textToLower.includes('deplacement jeunes') || 
      textToLower.includes('accompagnement jeune') || 
      textToLower.includes('accompagnement jeunes') || 
      textToLower.includes('tournoi jeune') ||
      textToLower.includes('tournoi jeunes') ||
      (
        (textToLower.includes('deplacement') || textToLower.includes('déplacement') || textToLower.includes('deplacements') || textToLower.includes('déplacements')) &&
        (
          textToLower.includes('jeune') || 
          textToLower.includes('jeunes') || 
          textToLower.includes('minibad') || 
          textToLower.includes('minibadminton') || 
          textToLower.includes('poussin') || 
          textToLower.includes('benjamin') || 
          textToLower.includes('minime') || 
          textToLower.includes('cadet') || 
          textToLower.includes('junior') || 
          textToLower.includes('toussaint') || 
          textToLower.includes('paques') || 
          textToLower.includes('pâques') || 
          textToLower.includes('noel') || 
          textToLower.includes('noël') || 
          textToLower.includes('fevrier') || 
          textToLower.includes('février') || 
          textToLower.includes('avril') || 
          textToLower.includes('printemps') || 
          textToLower.includes('hiver') || 
          textToLower.includes('hivers')
        )
      ) ||
      (
        (textToLower.includes('stage') || textToLower.includes('stg')) &&
        (
          textToLower.includes('jeune') || 
          textToLower.includes('jeunes') || 
          textToLower.includes('minibad') || 
          textToLower.includes('minibadminton') || 
          textToLower.includes('poussin') || 
          textToLower.includes('benjamin') || 
          textToLower.includes('minime') || 
          textToLower.includes('cadet') || 
          textToLower.includes('junior') || 
          textToLower.includes('toussaint') || 
          textToLower.includes('paques') || 
          textToLower.includes('pâques') || 
          textToLower.includes('noel') || 
          textToLower.includes('noël') || 
          textToLower.includes('fevrier') || 
          textToLower.includes('février') || 
          textToLower.includes('avril') || 
          textToLower.includes('printemps') || 
          textToLower.includes('hiver') || 
          textToLower.includes('hivers') ||
          textToLower.includes('juillet') ||
          textToLower.includes('aout') ||
          textToLower.includes('août')
        )
      ) ||
      textToLower.includes('toussaint') ||
      textToLower.includes('paques') ||
      textToLower.includes('pâques') ||
      textToLower.includes('noel') ||
      textToLower.includes('noël') ||
      textToLower.includes('minibad') ||
      textToLower.includes('minibadminton') ||
      textToLower.includes('airbnb') ||
      textToLower.includes('air bnb')
    ) {
      suggestedCategory = CAT_ACTIONS_JEUNES;
    } else if (
      textToLower.includes('ebad') || 
      textToLower.includes('e-bad') || 
      textToLower.includes('portefeuille ebad') || 
      textToLower.includes('portefeuille e-bad') ||
      textToLower.includes('blackminton') ||
      (textToLower.includes('tournoi') && !textToLower.includes('jeune'))
    ) {
      suggestedCategory = CAT_TOURNOIS_SENIOR;
    } else if (textToLower.includes('larde')) {
      if (textToLower.includes('cordage')) {
        suggestedCategory = CAT_CORDAGE_VENTE;
      } else if (textToLower.includes('volant')) {
        suggestedCategory = CAT_VOLANTS;
      } else {
        suggestedCategory = CAT_MATERIEL_CLUB;
      }
    } else if (textToLower.includes('ligue') || textToLower.includes('badminton')) {
      suggestedCategory = textToLower.includes('licence') ? CAT_LICENCES_FEDERATION : CAT_CHAMPIONNATS;
    } else if (
      textToLower.includes('codep91') || 
      textToLower.includes('comite') ||
      /\b(icr|icd|icp)\b/.test(textToLower) ||
      textToLower.includes('interclub') ||
      textToLower.includes('interclubs')
    ) {
      suggestedCategory = CAT_CHAMPIONNATS;
    } else if (textToLower.includes('sumup') || textToLower.includes('buvette')) {
      suggestedCategory = CAT_EVENEMENTS_BUVETTES;
    } else if (textToLower.includes('cordage') || textToLower.includes('raquette')) {
      suggestedCategory = CAT_CORDAGE_VENTE;
    } else if (textToLower.includes('volant')) {
      suggestedCategory = CAT_VOLANTS;
    } else if (textToLower.includes('stage')) {
      suggestedCategory = CAT_STAGES_FORMATIONS;
    } else if (
      (textToLower.includes('licence') && tx.amount < 0) ||
      (textToLower.includes('licences') && tx.amount < 0)
    ) {
      suggestedCategory = CAT_LICENCES_FEDERATION;
    } else if (textToLower.includes('salaire') || textToLower.includes('tetevuide') || textToLower.includes('meunier')) {
      suggestedCategory = CAT_SALAIRES_CHARGES;
    } else if (textToLower.includes('versement express')) {
      suggestedCategory = CAT_ADHESIONS;
    }

    // Présélection des candidats adhérents :
    const textToSearch = `${tx.name} ${tx.memo || ''}`.toLowerCase();
    const candidates = members.filter(m => {
      const cleanLast = cleanName(m.lastName);
      const cleanFirst = cleanName(m.firstName);
      const cleanP1 = cleanName(m.parent1Name);
      const cleanP2 = cleanName(m.parent2Name);

      const matchesLastName = cleanLast && textToSearch.includes(cleanLast);
      const matchesFirstName = cleanFirst && textToSearch.includes(cleanFirst);
      const matchesParent1 = cleanP1 && textToSearch.includes(cleanP1);
      const matchesParent2 = cleanP2 && textToSearch.includes(cleanP2);
      const matchesAmount = Math.abs(m.amountRemaining) === Math.abs(tx.amount);
      
      return matchesLastName || matchesFirstName || matchesParent1 || matchesParent2 || matchesAmount;
    }).slice(0, 5); // Max 5 candidats pour rester rapide

    // Essayer de trouver un match déterministe parfait
    let exactCandidate: typeof members[0] | null = null;
    const textNormalized = textToSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    for (const m of candidates) {
      const firstNorm = cleanName(m.firstName);
      const lastNorm = cleanName(m.lastName);
      const p1Norm = cleanName(m.parent1Name);
      const p2Norm = cleanName(m.parent2Name);
      
      const hasFirstAndLast = firstNorm && lastNorm && textNormalized.includes(firstNorm) && textNormalized.includes(lastNorm);
      const hasParent1 = p1Norm && textNormalized.includes(p1Norm);
      const hasParent2 = p2Norm && textNormalized.includes(p2Norm);

      if (hasFirstAndLast || hasParent1 || hasParent2) {
        exactCandidate = m;
        break;
      }
    }

    let suggestionResult = {
      category: suggestedCategory,
      memberId: exactCandidate ? exactCandidate.id : null as number | null,
      memberName: exactCandidate ? `${exactCandidate.lastName} ${exactCandidate.firstName}` : null as string | null,
      confidence: exactCandidate ? 0.9 : 0.5
    };

    if (candidates.length > 0) {
      // Appeler Workers AI (Llama 3)
      const prompt = `Tu es l'assistant comptable du club Nozay Badminton.
Opération bancaire à rapprocher :
- Libellé : "${tx.name}"
- Détails : "${tx.memo || 'Aucun'}"
- Montant : ${(tx.amount / 100).toFixed(2)} EUR (${tx.amount < 0 ? 'Débit' : 'Crédit'})

Catégories valides pour l'écriture :
- 1 (adhesions_inscriptions : cotisations, dossiers d'adhésion)
- 2 (sponsoring : partenaires)
- 3 (subventions : aides publiques)
- 4 (actions_jeunes : stages et événements jeunes)
- 5 (tournois_senior : inscriptions tournois)
- 6 (evenements_buvettes : consommations, soirées, SumUp)
- 7 (cordage_vente : achat cordage par adhérent ou achat de bobines/fournitures de cordages auprès d'un fournisseur)
- 8 (volants : achat de tubes de volants par adhérent ou achat fournisseur)
- 9 (salaires_charges : salaires entraîneurs, URSSAF)
- 10 (materiel_club : poteaux, filets, volants club - hors cordages)
- 11 (licences_federation : reversement FFBad)
- 12 (championnats : frais d'inscriptions des équipes du club, volants interclubs, repas/courses d'interclubs comme icr, icd, icp)
- 13 (stages_formations : stages adultes ou formations d'arbitres)
- 14 (fonctionnement_administratif : frais bancaires, assurances, licences)
- 15 (virements_internes : virements de compte à compte du club, transit de trésorerie)
${examplesPrompt}

Tarifs des produits de la boutique (si le montant correspond exactement, sers-toi en pour déduire la catégorie) :
${productsPrompt}

Liste des candidats adhérents possibles :
${candidates.map(c => `- ID: ${c.id}, Nom: ${c.lastName} ${c.firstName}, Parent 1: ${c.parent1Name || 'Aucun'}, Montant Restant Dû Adhésion: ${(c.amountRemaining / 100).toFixed(2)} EUR`).join('\n')}

Instructions :
1. Associe l'adhérent (memberId et memberName) si son nom ou prénom (ou celui d'un de ses parents) apparaît clairement dans le libellé ou memo de l'opération, même si son "Montant Restant Dû Adhésion" est de 0.00 EUR (il peut s'agir d'un achat de volants, cordages, etc.).
2. Choisis la catégorie la plus adaptée parmi la liste des catégories valides ci-dessus (ex: renvoie 8 si le motif mentionne "volants", 7 si "cordage", etc.).
3. Si le libellé bancaire ou le mémo est composé principalement d'une longue suite de chiffres (plus de 20 chiffres d'affilée), il s'agit d'un virement interne de compte à compte. Associe impérativement la catégorie 15 et aucun adhérent (memberId = null).
4. Si le montant correspond exactement au tarif d'un produit (par exemple 31.50 EUR pour les volants) ou à un multiple entier de celui-ci (comme 63.00 EUR pour 2 boîtes de volants, ou 30.00 EUR pour 2 cordages), et qu'il n'y a pas d'autre indication de catégorie dans le texte, choisis la catégorie associée à ce produit. Si le texte mentionne explicitement "adhesion", "cotisation" ou "inscription", choisis impérativement la catégorie 1 (adhesions_inscriptions), même si le montant correspond à un produit.
5. Si le libellé bancaire ou le mémo mentionne des déplacements, tournois, accompagnements pour les jeunes (ex: "deplacement jeune", "tournoi jeune") ou des stages de vacances scolaires ou d'entraînement pour jeunes/catégories jeunes (ex: "minibad", "stage minibad", "toussaint", "paques", "pâques", "stage février", "stage toussaint", "stg paques", "stage d'hiver", "stage de pâques", "stage de printemps", "stage jeunes", "course stage hivers") ou des frais d'hébergement/logement liés à ces déplacements pour les jeunes ou parents accompagnateurs (ex: "airbnb", "air bnb"), choisis impérativement la catégorie 4 (actions_jeunes) au lieu de la catégorie 9 (salaires_charges) ou 13 (stages_formations).
6. Si le libellé bancaire ou le mémo mentionne l'application "ebad" (ex: "ebad", "e-bad", "portefeuille ebad", "portefeuille e-bad") ou des tournois/événements adultes comme "blackminton", ou des inscriptions à des tournois adultes/seniors (sans mention de jeunes), choisis impérativement la catégorie 5 (tournois_senior).

Renvoie STRICTEMENT un objet JSON sous la forme suivante (sans aucun autre texte, balises markdown ou commentaires) :
{
  "memberId": <ID de l'adhérent associé ou null>,
  "memberName": "<Nom Prénom de l'adhérent associé ou null>",
  "category": <ID entier de la catégorie choisie>,
  "confidence": <nombre entre 0.0 et 1.0 indiquant ton niveau de certitude>,
  "reasoning": "<explication concise>"
}`;

      try {
        const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'user', content: prompt }]
        });
        const textRes = aiResponse.response || aiResponse.text || '';
        const jsonMatch = textRes.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestionResult = {
            category: parsed.category ? Number(parsed.category) : suggestedCategory,
            memberId: parsed.memberId || null,
            memberName: parsed.memberName || null,
            confidence: parsed.confidence || 0.5
          };
        }
      } catch (e) {
        if (candidates.length === 1) {
          suggestionResult.memberId = candidates[0].id;
          suggestionResult.memberName = `${candidates[0].lastName} ${candidates[0].firstName}`;
          suggestionResult.confidence = 0.7;
        }
      }
    }

    // Post-process : Rediriger les stages (13) et tournois (5) des mineurs vers Actions Jeunes (4)
    if (suggestionResult.memberId) {
      const matchedMember = members.find(m => m.id === suggestionResult.memberId);
      if (matchedMember && matchedMember.birthDate) {
        const birthYear = new Date(matchedMember.birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        if (age <= 18) {
          if (suggestionResult.category === CAT_STAGES_FORMATIONS || suggestionResult.category === CAT_TOURNOIS_SENIOR) {
            suggestionResult.category = CAT_ACTIONS_JEUNES;
          }
        }
      }
    }

    // Sauvegarder la suggestion en base de données
    await db.update(bankTransactionsTable)
      .set({ aiSuggestions: JSON.stringify(suggestionResult) })
      .where(eq(bankTransactionsTable.id, tx.id))
      .run();
    
    analyzedCount++;
  }

  return c.json({ success: true, count: analyzedCount });
});

accountingRouter.post('/bank-transactions/reconcile-bulk', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const requests = body.requests;
  if (!requests || !Array.isArray(requests)) {
    return c.json({ success: false, error: 'Missing requests array.' }, 400);
  }

  const db = drizzle(c.env.DB);

  try {
    let count = 0;
    await db.transaction(async (tx) => {
      for (const req of requests) {
        const result = await reconcileBankTxInternal(tx, req.btId, req);
        if (!result.success) {
          throw new AppError(result.error || 'Matching operation failed', result.status || 400);
        }
        count++;
      }
    });

    return c.json({ success: true, count });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      try {
        let count = 0;
        for (const req of requests) {
          const result = await reconcileBankTxInternal(db, req.btId, req);
          if (!result.success) {
            throw new AppError(result.error || 'Matching operation failed', result.status || 400);
          }
          count++;
        }
        return c.json({ success: true, count });
      } catch (innerErr: any) {
        if (innerErr instanceof AppError) throw innerErr;
        return c.json({ success: false, error: innerErr.message }, 400);
      }
    }
    if (err instanceof AppError) {
      throw err;
    }
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.post('/bank-transactions/:id/reconcile', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  try {
    await db.transaction(async (tx) => {
      const result = await reconcileBankTxInternal(tx, id, body);
      if (!result.success) {
        throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
      }
    });
    return c.json({ success: true });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      const result = await reconcileBankTxInternal(db, id, body);
      if (!result.success) {
        throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
      }
      return c.json({ success: true });
    }
    if (err instanceof AppError) {
      throw err;
    }
    return c.json({ success: false, error: err.message }, err.status || 400);
  }
});

accountingRouter.post('/bank-transactions/:id/ignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  await db.update(bankTransactionsTable)
    .set({ status: 'ignored' })
    .where(eq(bankTransactionsTable.id, id))
    .run();

  return c.json({ success: true });
});

accountingRouter.post('/bank-transactions/:id/unignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  await db.update(bankTransactionsTable)
    .set({ status: 'pending' })
    .where(eq(bankTransactionsTable.id, id))
    .run();

  return c.json({ success: true });
});

// 4. CHECKS ROUTES
accountingRouter.post('/checks/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  try {
    const formData = await c.req.parseBody();
    const file = formData.file;
    if (!file) {
      return c.json({ success: false, error: 'Fichier image manquant.' }, 400);
    }

    let bytes: ArrayBuffer;
    if (typeof file === 'string') {
      if (file.startsWith('data:')) {
        const base64Data = file.split(',')[1];
        bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
      } else {
        bytes = new TextEncoder().encode(file).buffer;
      }
    } else if (typeof file === 'object' && file !== null) {
      if ('arrayBuffer' in file && typeof (file as any).arrayBuffer === 'function') {
        bytes = await (file as any).arrayBuffer();
      } else {
        return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
      }
    } else {
      return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
    }

    let aiRes: any;
    try {
      const model = '@cf/meta/llama-3.2-11b-vision-instruct';
      const systemPrompt = `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the 7-digit check number, usually printed at the bottom-left corner, e.g. '2512612'. Do NOT use the longer bank routing or account numbers)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the handwritten issue date, usually in format DD/MM/YY or DD/MM/YYYY. Look in the bottom-right section, under the numerical amount box and next to the signature, following the pre-printed word 'le' or 'fait le', e.g. '10/09/20' should be extracted as '2020-09-10')"
}
Return ONLY the raw JSON object. Do not wrap it in markdown or other text.`;

      aiRes = await c.env.AI.run(model, {
        prompt: systemPrompt,
        image: [...new Uint8Array(bytes)]
      });
    } catch (llamaErr: any) {
      let agreed = false;
      if (llamaErr.message && (llamaErr.message.includes("submit the prompt 'agree'") || llamaErr.message.includes("5016"))) {
        try {
          await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            prompt: 'agree',
            image: [...new Uint8Array(bytes)]
          });
          agreed = true;
          
          aiRes = await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            prompt: `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the 7-digit check number, usually printed at the bottom-left corner, e.g. '2512612'. Do NOT use the longer bank routing or account numbers)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the handwritten issue date, usually in format DD/MM/YY or DD/MM/YYYY. Look in the bottom-right section, under the numerical amount box and next to the signature, following the pre-printed word 'le' or 'fait le', e.g. '10/09/20' should be extracted as '2020-09-10')"
}`,
            image: [...new Uint8Array(bytes)]
          });
        } catch (agreeErr) {
          // ignore
        }
      }

      if (!agreed || !aiRes) {
        const modelLlava = '@cf/llava-hf/llava-1.5-7b-hf';
        const systemPrompt = `Identify check details in this image. The check number (number) is always a 7-digit number, usually printed at the bottom-left corner (e.g. '2512612'). Do NOT use the longer account numbers. Look in the bottom-right section below the numerical amount box and next to the signature, following 'le' or 'fait le' for the handwritten issue date (e.g. '10/09/20' should be extracted as '2020-09-10'). Extract the pre-printed account holder name as emitter (e.g. 'ANTENNE REUNION TELEVISION', NOT the payee 'Association Sourice de l'enfant'). Output JSON format: {"number":"1234567", "amount":150.0, "emitter":"JEAN DUPONT", "bank":"LCL", "date":"2026-07-10"}`;

        aiRes = await c.env.AI.run(modelLlava, {
          prompt: systemPrompt,
          image: [...new Uint8Array(bytes)]
        });
      }
    }

    let extracted: any = {};
    let textResult = '';
    if (typeof aiRes === 'string') {
      textResult = aiRes;
    } else if (aiRes && typeof aiRes === 'object') {
      if (typeof (aiRes as any).response === 'string') {
        textResult = (aiRes as any).response;
      } else if ((aiRes as any).response !== undefined && (aiRes as any).response !== null) {
        textResult = JSON.stringify((aiRes as any).response);
      } else {
        textResult = JSON.stringify(aiRes);
      }
    }
    
    try {
      const jsonMatch = textResult.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        extracted = JSON.parse(textResult);
      }
    } catch (e) {
      extracted = {};
    }

    // fallback extraction regex
    if (!extracted.number) {
      const numMatch = textResult.match(/\b\d{7}\b/);
      if (numMatch) {
        extracted.number = numMatch[0];
      } else {
        const numMatchAny = textResult.match(/n°\s*(\d+)/i) || textResult.match(/numero\s*(\d+)/i);
        if (numMatchAny) extracted.number = numMatchAny[1];
      }
    }

    if (!extracted.amount) {
      const amtMatch = textResult.match(/(\d+[\.,]\d{2})\s*€/) || textResult.match(/(\d+[\.,]\d{2})\s*eur/i) || textResult.match(/(\d+)\s*€/) || textResult.match(/montant\s*(?:de\s*)?(\d+)/i);
      if (amtMatch) {
        extracted.amount = parseFloat(amtMatch[1].replace(',', '.'));
      }
    }

    if (!extracted.emitter) {
      const emitMatch = textResult.match(/émetteur\s*:\s*([A-Za-z\s\-]+)/i) || textResult.match(/de\s*([A-Z][a-z\-]+\s+[A-Z][a-z\-]+)/);
      if (emitMatch) {
        const val = emitMatch[1].trim();
        if (!/nozay/i.test(val) && !/bad/i.test(val) && !/association/i.test(val)) {
          extracted.emitter = val;
        }
      }
    }

    if (!extracted.bank) {
      const bankMatch = textResult.match(/banque\s*:\s*([A-Za-z\s]+)/i) || textResult.match(/(Société Générale|Crédit Agricole|LCL|Bred|BNP|La Banque Postale|CIC|Crédit Mutuel)/i);
      if (bankMatch) {
        extracted.bank = bankMatch[1].trim();
      }
    }

    if (!extracted.date) {
      const dateMatch = textResult.match(/(\d{2})[\/\-\s](\d{2})[\/\-\s](\d{2,4})/);
      if (dateMatch) {
        const day = dateMatch[1];
        const month = dateMatch[2];
        let year = dateMatch[3];
        if (year.length === 2) {
          year = `20${year}`;
        }
        extracted.date = `${year}-${month}-${day}`;
      } else {
        const dateMatchISO = textResult.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
        if (dateMatchISO) {
          extracted.date = dateMatchISO[0];
        }
      }
    }

    let matchedMember = null;
    const db = drizzle(c.env.DB);
    const members = await db.select().from(membersTable).all();

    if (extracted.emitter) {
      const cleanEmitter = cleanName(extracted.emitter);
      for (const m of members) {
        const cleanLast = cleanName(m.lastName);
        const cleanFirst = cleanName(m.firstName);
        const cleanP1 = cleanName(m.parent1Name);
        const cleanP2 = cleanName(m.parent2Name);

        const hasFirstAndLast = cleanFirst && cleanLast && cleanEmitter.includes(cleanFirst) && cleanEmitter.includes(cleanLast);
        const hasParent1 = cleanP1 && cleanEmitter.includes(cleanP1);
        const hasParent2 = cleanP2 && cleanEmitter.includes(cleanP2);

        if (hasFirstAndLast || hasParent1 || hasParent2) {
          matchedMember = m;
          break;
        }
      }
    }

    return c.json({
      success: true,
      data: {
        number: extracted.number || '',
        amount: extracted.amount || 0,
        emitter: extracted.emitter || '',
        bank: extracted.bank || '',
        memberId: matchedMember ? matchedMember.id : null,
        memberName: matchedMember ? `${matchedMember.lastName} ${matchedMember.firstName}` : null,
        date: extracted.date || null
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

accountingRouter.get('/checks', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);

  const conditions = [eq(checksTable.seasonId, season)];
  if (status) {
    conditions.push(eq(checksTable.status, status as any));
  }

  const data = await db.select({
    id: checksTable.id,
    checkDepositId: checksTable.checkDepositId,
    seasonId: checksTable.seasonId,
    number: checksTable.number,
    amount: checksTable.amount,
    emitter: checksTable.emitter,
    bank: checksTable.bank,
    memberId: checksTable.memberId,
    transactionId: checksTable.transactionId,
    status: checksTable.status,
    photoUrl: checksTable.photoUrl,
    createdAt: checksTable.createdAt,
    memberName: sql<string | null>`members.last_name || ' ' || members.first_name`,
    memberLicence: sql<string | null>`members.licence`
  })
    .from(checksTable)
    .leftJoin(membersTable, eq(checksTable.memberId, membersTable.id))
    .where(and(...conditions))
    .orderBy(desc(checksTable.createdAt))
    .all();

  return c.json({ success: true, data });
});

accountingRouter.post('/checks', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (!body.seasonId || !body.number || !body.amount || !body.emitter) {
    return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
  }

  const categoryVal = body.category ? Number(body.category) : 1;
  const descStr = body.description || `Règlement par chèque n°${body.number} de ${body.emitter}`;

  const [newTx] = await db.insert(transactionsTable).values({
    seasonId: body.seasonId,
    type: 'recette',
    accountId: 'current',
    category: categoryVal,
    amount: body.amount,
    date: body.date || new Date().toISOString().split('T')[0],
    paymentMethod: 'cheque',
    description: descStr,
    reference: `Chèque n°${body.number}`,
    memberId: body.memberId || null,
    createdAt: new Date()
  }).returning();

  const [newCheck] = await db.insert(checksTable).values({
    seasonId: body.seasonId,
    number: body.number,
    amount: body.amount,
    emitter: body.emitter,
    bank: body.bank || null,
    memberId: body.memberId || null,
    transactionId: newTx.id,
    status: 'received',
    photoUrl: body.photoUrl || null,
    createdAt: new Date()
  }).returning();

  if (body.memberId && (categoryVal === 1 || String(categoryVal) === '1')) {
    const member = await db.select().from(membersTable).where(eq(membersTable.id, body.memberId)).get();
    if (member) {
      const newReceived = member.amountReceived + body.amount;
      const newRemaining = Math.max(0, member.amountDue - newReceived);
      const isPaid = newRemaining === 0;

      await db.update(membersTable)
        .set({
          amountReceived: newReceived,
          amountRemaining: newRemaining,
          paid: isPaid
        })
        .where(eq(membersTable.id, body.memberId))
        .run();
    }
  }

  return c.json({ success: true, data: newCheck });
});

accountingRouter.delete('/checks/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  const check = await db.select().from(checksTable).where(eq(checksTable.id, id)).get();
  if (!check) {
    return c.json({ success: false, error: 'Chèque non trouvé.' }, 404);
  }

  if (check.transactionId) {
    await db.update(checksTable)
      .set({ transactionId: null })
      .where(eq(checksTable.id, id))
      .run();

    const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, check.transactionId)).get();
    if (tx) {
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
      await db.delete(transactionsTable).where(eq(transactionsTable.id, tx.id)).run();
    }
  }

  await db.delete(checksTable).where(eq(checksTable.id, id)).run();
  return c.json({ success: true });
});

// 5. CHECK DEPOSITS ROUTES
accountingRouter.post('/check-deposits', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (!body.seasonId || !body.reference || !body.date || !body.checkIds || body.checkIds.length === 0) {
    return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
  }

  const checksToDeposit = await db.select().from(checksTable).where(inArray(checksTable.id, body.checkIds)).all();
  if (checksToDeposit.length === 0) {
    return c.json({ success: false, error: 'Aucun chèque valide trouvé.' }, 400);
  }
  const totalAmount = checksToDeposit.reduce((sum, ch) => sum + ch.amount, 0);

  const [deposit] = await db.insert(checkDepositsTable).values({
    seasonId: body.seasonId,
    reference: body.reference,
    date: body.date,
    amount: totalAmount,
    status: 'deposited',
    createdAt: new Date()
  }).returning();

  await db.update(checksTable)
    .set({
      checkDepositId: deposit.id,
      status: 'deposited'
    })
    .where(inArray(checksTable.id, body.checkIds))
    .run();

  return c.json({ success: true, data: deposit });
});

accountingRouter.get('/check-deposits', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const db = drizzle(c.env.DB);

  const deposits = await db.select()
    .from(checkDepositsTable)
    .where(eq(checkDepositsTable.seasonId, season))
    .orderBy(desc(checkDepositsTable.date), desc(checkDepositsTable.id))
    .all();

  return c.json({ success: true, data: deposits });
});

accountingRouter.post('/check-deposits/:id/clear', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (!body.bankTransactionId) {
    return c.json({ success: false, error: 'bankTransactionId requis.' }, 400);
  }

  await db.update(checkDepositsTable)
    .set({
      status: 'cleared',
      bankTransactionId: body.bankTransactionId
    })
    .where(eq(checkDepositsTable.id, id))
    .run();

  await db.update(bankTransactionsTable)
    .set({
      status: 'reconciled'
    })
    .where(eq(bankTransactionsTable.id, body.bankTransactionId))
    .run();

  return c.json({ success: true });
});

accountingRouter.post('/check-deposits/:id/delete', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  const deposit = await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, id)).get();
  if (!deposit) {
    return c.json({ success: false, error: 'Remise de chèques non trouvée.' }, 404);
  }

  if (deposit.bankTransactionId) {
    await db.update(bankTransactionsTable)
      .set({ status: 'pending' })
      .where(eq(bankTransactionsTable.id, deposit.bankTransactionId))
      .run();
  }

  await db.update(checksTable)
    .set({
      checkDepositId: null,
      status: 'received'
    })
    .where(eq(checksTable.checkDepositId, id))
    .run();

  await db.delete(checkDepositsTable).where(eq(checkDepositsTable.id, id)).run();
  return c.json({ success: true });
});

// 6. CATEGORIES ROUTES
accountingRouter.get('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = drizzle(c.env.DB);
  try {
    const list = await db.select().from(categoriesTable).all();
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

accountingRouter.post('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const newCat = await db.insert(categoriesTable).values({
      adminLabel: body.adminLabel,
      adherentLabel: body.adherentLabel,
      hideInExpenses: body.hideInExpenses || false,
      receiptCode: body.receiptCode,
      expenseCode: body.expenseCode,
      createdAt: new Date()
    }).returning().get();
    return c.json({ success: true, data: newCat });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.put('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await db.update(categoriesTable).set({
      adminLabel: body.adminLabel,
      adherentLabel: body.adherentLabel,
      hideInExpenses: body.hideInExpenses,
      receiptCode: body.receiptCode,
      expenseCode: body.expenseCode
    }).where(eq(categoriesTable.id, id)).returning().get();

    if (!updated) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.delete('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  try {
    const deleted = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning().get();
    if (!deleted) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 7. ACCOUNT CLASSES ROUTES
accountingRouter.get('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = drizzle(c.env.DB);
  try {
    const list = await db.select().from(accountClassesTable).all();
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

accountingRouter.post('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  if (!body.code || !body.label || !body.type) {
    return c.json({ success: false, error: 'Le code, le libellé et le type sont obligatoires.' }, 400);
  }

  try {
    const newClass = await db.insert(accountClassesTable).values({
      code: body.code.trim(),
      label: body.label.trim(),
      type: body.type,
      createdAt: new Date()
    }).returning().get();
    return c.json({ success: true, data: newClass });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.put('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await db.update(accountClassesTable).set({
      label: body.label?.trim(),
      type: body.type
    }).where(eq(accountClassesTable.code, code)).returning().get();

    if (!updated) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.delete('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const db = drizzle(c.env.DB);
  try {
    const deleted = await db.delete(accountClassesTable).where(eq(accountClassesTable.code, code)).returning().get();
    if (!deleted) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 8. INVOICES ROUTES
accountingRouter.get('/invoices', async (c) => {
  const season = c.req.query('season');
  if (!season) return c.json({ success: false, error: 'Saison manquante' }, 400);
  const db = drizzle(c.env.DB);
  const data = await db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, season)).all();
  return c.json({ success: true, data });
});

accountingRouter.get('/invoices/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).all();
  return c.json({ success: true, data: { ...invoice, items } });
});

accountingRouter.post('/invoices', async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  if (await isSeasonClosed(db, body.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }
  const seasonShort = body.seasonId.replace('-', '');
  const prefix = `FAC-${seasonShort}-NBA91-`;
  const lastInvoices = await db.select()
    .from(invoicesTable)
    .where(like(invoicesTable.invoiceNumber, `${prefix}%`))
    .all();
  let nextNum = 1;
  if (lastInvoices.length > 0) {
    const nums = lastInvoices.map(inv => {
      const parts = inv.invoiceNumber.split('-');
      return parseInt(parts[parts.length - 1]) || 0;
    });
    nextNum = Math.max(...nums) + 1;
  }
  const invoiceNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

  const [newInvoice] = await db.insert(invoicesTable).values({
    invoiceNumber,
    seasonId: body.seasonId,
    date: body.date,
    dueDate: body.dueDate,
    clientName: body.clientName,
    clientAddress: body.clientAddress || null,
    clientEmail: body.clientEmail || null,
    subject: body.subject || null,
    location: body.location || null,
    period: body.period || null,
    attendees: body.attendees || null,
    totalAmount: body.totalAmount,
    status: 'draft',
    createdAt: new Date()
  }).returning();

  if (body.items && body.items.length > 0) {
    for (const item of body.items) {
      await db.insert(invoiceItemsTable).values({
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        createdAt: new Date()
      });
    }
  }

  return c.json({ success: true, data: newInvoice });
});

accountingRouter.put('/invoices/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  if (invoice.status !== 'draft') {
    return c.json({ success: false, error: 'Modification impossible car non au statut Brouillon' }, 400);
  }
  if (await isSeasonClosed(db, invoice.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }

  await db.update(invoicesTable).set({
    date: body.date,
    dueDate: body.dueDate,
    clientName: body.clientName,
    clientAddress: body.clientAddress || null,
    clientEmail: body.clientEmail || null,
    subject: body.subject || null,
    location: body.location || null,
    period: body.period || null,
    attendees: body.attendees || null,
    totalAmount: body.totalAmount
  }).where(eq(invoicesTable.id, id)).run();

  await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).run();
  if (body.items && body.items.length > 0) {
    for (const item of body.items) {
      await db.insert(invoiceItemsTable).values({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        createdAt: new Date()
      });
    }
  }
  return c.json({ success: true });
});

accountingRouter.delete('/invoices/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
    return c.json({ success: false, error: 'Seules les factures brouillon ou annulées peuvent être supprimées' }, 400);
  }
  if (await isSeasonClosed(db, invoice.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).run();
  return c.json({ success: true });
});

accountingRouter.post('/invoices/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const { status } = await c.req.json();
  const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Statut invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  if (await isSeasonClosed(db, invoice.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }
  await db.update(invoicesTable).set({ status }).where(eq(invoicesTable.id, id)).run();
  return c.json({ success: true });
});
