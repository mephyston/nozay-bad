import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getAttachment } from './handler';
import { getAttachmentParamsSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const getAttachmentRoute = new Hono<{ Bindings: Bindings }>();

/*
  Le contenu en JSON (`dataUrl`) plutôt qu'en octets : l'écran le montre tel quel dans
  un `<img>`, ou en fait un `Blob` pour un PDF, comme il le faisait du justificatif
  unique. Une pièce à la fois : la liste n'en transporte plus aucune.
*/
getAttachmentRoute.get('/:id/attachments/:attachmentId', tbValidator('param', getAttachmentParamsSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const { id, attachmentId } = c.req.valid('param');
  const db = createDb(c.env.DB);

  const piece = await getAttachment(db, { expenseId: Number(id), attachmentId: Number(attachmentId) });
  return c.json({ success: true, data: piece });
});
