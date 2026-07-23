import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { importBankStatement } from './handler';
import { importBankStatementFormSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const importBankStatementRoute = new Hono<{ Bindings: Bindings }>();

importBankStatementRoute.post(
  '/bank-transactions/import',
  tbValidator('form', importBankStatementFormSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { seasonId, accountId: forcedAccountId, file } = c.req.valid('form');

    if (!file) {
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

    const db = createDb(c.env.DB);
    const result = await importBankStatement(db, content, seasonId, forcedAccountId as string);
    return c.json({ success: true, ...result });
  }
);
