import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getMe } from './handler';
import { toActorDto } from '../get-actor/dto';

export type Bindings = {
  DB: D1Database;
};

export const getMeRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Identité et droits effectifs de l'appelant.
 *
 * L'adresse vient de l'en-tête `x-user-email`, posé par l'application admin après
 * vérification du JWT Cloudflare Access. Elle n'est jamais reprise du corps ou de la
 * query : l'API n'est atteignable qu'avec la clé interne, donc seul un Worker de
 * confiance peut affirmer une identité.
 *
 * Un compte inconnu répond 200 avec un acteur nul, et non 403 : l'application admin
 * peut ainsi afficher « compte non configuré » plutôt qu'une erreur brute.
 */
getMeRoute.get('/me', async (c) => {
  if (!c.env?.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const email = c.req.header('x-user-email') || '';
  if (!email) {
    return c.json({ success: false, error: 'Identité appelante absente' }, 400);
  }

  const db = createDb(c.env.DB);
  const { actor, bootstrapped } = await getMe(db, email);

  if (bootstrapped) {
    console.warn(`[iam] premier administrateur créé par bootstrap : ${actor?.email}`);
  }

  return c.json({ success: true, data: actor ? toActorDto(actor) : null });
});
