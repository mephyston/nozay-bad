import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listBankTransactions, updateBankTransactionStatus, analyzeBankTransactions } from '../../../bank/handler';
import { importBankStatement } from '../../../commands/import-bank-statement/handler';
import { reconcileBankTransaction, reconcileBulkTransactions } from '../../../commands/reconcile-bank-transaction/handler';
import type { Bindings } from '../routes';

export const bankRouter = new Hono<{ Bindings: Bindings }>();

bankRouter.get('/', async (c) => {
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

  const data = await listBankTransactions(db, season, { status, accountId });
  return c.json({ success: true, data });
});

bankRouter.post('/import', async (c) => {
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

  const db = drizzle(c.env.DB);
  const result = await importBankStatement(db, content, seasonId, forcedAccountId);
  return c.json({ success: true, ...result });
});

bankRouter.post('/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const singleId = c.req.query('id');
  const idNum = singleId ? parseInt(singleId) : undefined;
  const db = drizzle(c.env.DB);

  const result = await analyzeBankTransactions(db, c.env.AI, season, idNum);
  return c.json({ success: true, ...result });
});

bankRouter.post('/reconcile-bulk', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const requests = body.requests;
  if (!requests || !Array.isArray(requests)) {
    return c.json({ success: false, error: 'Missing requests array.' }, 400);
  }
  const db = drizzle(c.env.DB);
  const count = await reconcileBulkTransactions(db, requests);
  return c.json({ success: true, count });
});

bankRouter.post('/:id/reconcile', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  await reconcileBankTransaction(db, id, body);
  return c.json({ success: true });
});

bankRouter.post('/:id/ignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  await updateBankTransactionStatus(db, id, 'ignored');
  return c.json({ success: true });
});

bankRouter.post('/:id/unignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  await updateBankTransactionStatus(db, id, 'pending');
  return c.json({ success: true });
});
