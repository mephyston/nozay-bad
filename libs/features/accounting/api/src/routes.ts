import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, or, eq, ne, like, sql, inArray, desc, gte, lte, isNull } from 'drizzle-orm';
import {
  transactionsTable,
  bankTransactionsTable,
  checksTable,
  checkDepositsTable,
  categoriesTable,
  accountClassesTable,
  invoicesTable,
  invoiceItemsTable
} from '@metacult/features-accounting-data-access';
import {
  membersTable
} from '@metacult/features-members-data-access';
import { seasonsRouter } from './routes/seasons';
import { transactionsRouter } from './routes/transactions';
import { bankRouter } from './routes/bank';
import { isSeasonClosed, normalizeCategory, AppError } from '@metacult/shared-db';
import { cleanName } from './helpers';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const accountingRouter = new Hono<{ Bindings: Bindings }>();


// 1. SEASONS ROUTES
accountingRouter.route('/seasons', seasonsRouter);

// 2. TRANSACTIONS ROUTES
accountingRouter.route('/transactions', transactionsRouter);

// 3. BANK TRANSACTIONS ROUTES
accountingRouter.route('/bank-transactions', bankRouter);

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
