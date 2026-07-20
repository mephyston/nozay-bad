import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { AppError } from '@metacult/shared-db';
import { importMembersSchema } from '../../import-members-csv/validator';
import { importMembersFromCsv } from '../../import-members-csv/handler';
import { listMembers } from '../../list-members/handler';
import { getMemberByLicence } from '../../get-member-by-licence/handler';
import { getMemberCseData } from '../../get-member-cse-data/handler';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const membersRouter = new Hono<{ Bindings: Bindings }>();

membersRouter.post('/import', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
    throw new AppError('Payload Too Large: Le fichier dépasse la limite autorisée de 5 Mo', 413);
  }
  await next();
}, tbValidator('form', importMembersSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const { file } = c.req.valid('form');
  if (!file) {
    return c.json({ success: false, error: 'Missing file field in multipart form data' }, 400);
  }

  let csvText: string;
  if (typeof file === 'string') {
    csvText = file;
  } else if (typeof file === 'object' && file !== null) {
    try {
      if ('arrayBuffer' in file && typeof (file as any).arrayBuffer === 'function') {
        const arrayBuffer = await (file as any).arrayBuffer();
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        try {
          csvText = utf8Decoder.decode(arrayBuffer);
        } catch (e) {
          const winDecoder = new TextDecoder('windows-1252');
          csvText = winDecoder.decode(arrayBuffer);
        }
      } else if ('text' in file && typeof (file as any).text === 'function') {
        csvText = await (file as any).text();
      } else {
        return c.json({ success: false, error: 'Invalid file format' }, 400);
      }
    } catch (err) {
      return c.json({ success: false, error: 'Failed to read file content' }, 400);
    }
  } else {
    return c.json({ success: false, error: 'Invalid file format' }, 400);
  }

  const db = drizzle(c.env.DB);
  const result = await importMembersFromCsv(db, csvText);

  return c.json({
    success: true,
    ...result
  });
});

membersRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const search = c.req.query('search') || '';
  const gender = c.req.query('gender') || '';
  const type = c.req.query('type') || '';
  const status = c.req.query('status') || '';
  const season = c.req.query('season') || '';

  const paidParam = c.req.query('paid');
  let paid: boolean | undefined = undefined;
  if (paidParam === 'true') {
    paid = true;
  } else if (paidParam === 'false') {
    paid = false;
  }

  const db = drizzle(c.env.DB);
  const result = await listMembers(db, { search, gender: gender as any, type, status, season, paid }, { page, limit });

  return c.json({
    success: true,
    ...result
  });
});

membersRouter.get('/:licence', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const licence = c.req.param('licence');
  const season = c.req.query('season') || '';
  const db = drizzle(c.env.DB);

  const member = await getMemberByLicence(db, licence, season);

  return c.json({
    success: true,
    data: member,
  });
});

membersRouter.get('/:id/cse-data', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const data = await getMemberCseData(db, id);

  return c.json({
    success: true,
    data
  });
});
