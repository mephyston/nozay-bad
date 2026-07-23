import { Hono } from 'hono';
import { tbValidator } from '@hono/typebox-validator';
import { AppError, createDb } from '@metacult/shared-db';
import { importMembersSchema } from './validator';
import { importMembersFromCsv } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const importMembersRoute = new Hono<{ Bindings: Bindings }>();

importMembersRoute.post('/import', async (c, next) => {
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

  const db = createDb(c.env.DB);
  const result = await importMembersFromCsv(db, csvText);

  return c.json({
    success: true,
    ...result
  });
});
